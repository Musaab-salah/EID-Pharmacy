import { Button, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd'
import { QrcodeOutlined, UploadOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { API_BASE } from '../config'
import PageObjective from '../components/PageObjective'
import BarcodeScanModal from '../components/admin/BarcodeScanModal'
import ImportExcelModal from '../components/admin/ImportExcelModal'
import { exportToPdf, printTable } from '../utils/exportUtils'
import { printBarcodeLabels } from '../utils/labelPrint'

type Product = {
  id: number
  name_ar: string
  name_en: string
  category?: number
  category_name_en?: string
  category_name_ar?: string
  supplier?: number
  supplier_name_en?: string
  supplier_name_ar?: string
  branches?: number[]
  barcode: string
  barcodes?: string[]
  barcode_list?: string[]
  sku: string
  price: number
  purchase_price: number
  min_quantity: number
  image?: string
  place_of_manufacture?: string
  product_type?: string
  strips_per_box?: number
  pills_per_strip?: number
  price_per_strip?: number
  price_per_box?: number
}

const Products = () => {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [importExcelOpen, setImportExcelOpen] = useState(false)
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false)
  const [form] = Form.useForm<Product>()
  const [supplierForm] = Form.useForm<{ name_en: string; name_ar: string; phone: string; address: string }>()

  const load = async () => {
    const res = await api.get('/products/')
    setItems(res.data)
  }

  const loadSuppliers = () => api.get('/suppliers/').then((res) => setSuppliers(res.data))

  useEffect(() => {
    load()
    api.get('/categories/').then((res) => setCategories(res.data))
    loadSuppliers()
    api.get('/branches/').then((res) => setBranches(res.data))
  }, [])

  const handleCreateSupplier = async (values: { name_en: string; name_ar: string; phone: string; address: string }) => {
    try {
      const res = await api.post('/suppliers/', values)
      const newSupplier = res.data
      setSuppliers((prev) => [...prev, newSupplier])
      form.setFieldValue('supplier', newSupplier.id)
      setSupplierModalOpen(false)
      supplierForm.resetFields()
    } catch (error: any) {
      const detail = error?.response?.data
      alert(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  const handleSubmit = async (values: Product) => {
    try {
      const payload = { ...values }
      const branchesArr = payload.branches ?? []
      const barcodeList = (payload.barcodes ?? [])
        .map((x) => String(x).trim())
        .filter(Boolean)
      const appendPayload = (fd: FormData, p: Record<string, unknown>) => {
        Object.entries(p).forEach(([k, v]) => {
          if (k === 'branches') return
          if (k === 'barcodes') return
          if (v != null && v !== '' && v !== undefined) fd.append(k, String(v))
        })
        fd.append('branches', JSON.stringify(branchesArr))
        fd.append('barcode_list', JSON.stringify(barcodeList))
      }
      if (imageFile) {
        const formData = new FormData()
        appendPayload(formData, payload)
        formData.append('image', imageFile)
        if (editing) {
          await api.patch(`/products/${editing.id}/`, formData)
        } else {
          await api.post('/products/', formData)
        }
      } else {
        ;(payload as any).barcode_list = barcodeList
        delete (payload as any).barcodes
        if (editing) {
          await api.patch(`/products/${editing.id}/`, payload)
        } else {
          await api.post('/products/', payload)
        }
      }
      setOpen(false)
      setEditing(null)
      setImageFile(null)
      form.resetFields()
      load()
    } catch (error: any) {
      const detail = error?.response?.data
      alert(typeof detail === 'string' ? detail : JSON.stringify(detail))
    }
  }

  const handleEdit = (record: Product) => {
    setEditing(record)
    setImageFile(null)
    setOpen(true)
    form.setFieldsValue({
      ...record,
      branches: record.branches ?? [],
      barcodes: record.barcodes ?? (record.barcode ? [record.barcode] : []),
      product_type: record.product_type ?? 'default',
      strips_per_box: record.strips_per_box ?? 1,
      pills_per_strip: record.pills_per_strip ?? 1,
    })
  }

  const handleDelete = async (record: Product) => {
    await api.delete(`/products/${record.id}/`)
    load()
  }

  const handlePrintLabels = (record: Product) => {
    const code = String(record.barcode || record.barcodes?.[0] || '').trim()
    if (!code) {
      message.warning(t('barcode_scan_placeholder'))
      return
    }
    let qty = 12
    Modal.confirm({
      title: t('print'),
      content: (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{t('min_quantity')}</span>
          <Input
            type="number"
            min={1}
            defaultValue={qty}
            onChange={(e) => {
              qty = Number(e.target.value || 1)
            }}
            style={{ width: 120 }}
          />
        </div>
      ),
      okText: t('print'),
      onOk: () => {
        const name = i18n.language === 'ar' ? record.name_ar : record.name_en
        printBarcodeLabels({ name, code, price: record.price }, qty)
      },
    })
  }

  const applyScannedBarcode = (code: string) => {
    form.setFieldValue('barcode', code)
    const found = items.find(
      (p) => String(p.barcode || '').trim() === code || String(p.sku || '').trim() === code,
    )
    if (found && (!editing || found.id !== editing.id)) {
      const label = i18n.language === 'ar' ? found.name_ar : found.name_en
      message.warning(`${t('product_duplicate_barcode')}: ${label}`)
    }
  }

  const handlePrint = () => {
    const headers = [
      t('name_en'),
      t('name_ar'),
      t('category'),
      t('supplier'),
      t('place_of_manufacture'),
      t('barcode'),
      t('sku'),
      t('price'),
      t('purchase_price'),
      t('min_quantity'),
    ]
    const rows = items.map((p) => [
      p.name_en || '',
      p.name_ar || '',
      p.category_name_en || '-',
      p.supplier_name_ar || p.supplier_name_en || '-',
      p.place_of_manufacture || '-',
      p.barcode || '-',
      p.sku || '-',
      String(p.price ?? ''),
      String(p.purchase_price ?? ''),
      String(p.min_quantity ?? 0),
    ])
    printTable(t('products'), headers, rows)
  }

  const handleExportPdf = () => {
    const headers = [
      t('name_en'),
      t('name_ar'),
      t('category'),
      t('supplier'),
      t('place_of_manufacture'),
      t('barcode'),
      t('sku'),
      t('price'),
      t('purchase_price'),
      t('min_quantity'),
    ]
    const rows = items.map((p) => [
      p.name_en || '',
      p.name_ar || '',
      p.category_name_en || '-',
      p.supplier_name_ar || p.supplier_name_en || '-',
      p.place_of_manufacture || '-',
      p.barcode || '-',
      p.sku || '-',
      String(p.price ?? ''),
      String(p.purchase_price ?? ''),
      String(p.min_quantity ?? 0),
    ])
    exportToPdf(t('products'), headers, rows, `products-${Date.now()}.pdf`)
  }

  return (
    <div>
      <PageObjective objectiveKey="page_objective_products" />
      <Space style={{ marginBottom: 16 }} wrap>
        <Typography.Title level={3}>{t('products')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
        <Button onClick={handlePrint}>{t('print')}</Button>
        <Button onClick={handleExportPdf}>{t('export_pdf')}</Button>
        <Button icon={<UploadOutlined />} onClick={() => setImportExcelOpen(true)}>
          {t('import_products_excel')}
        </Button>
      </Space>

      <ImportExcelModal
        open={importExcelOpen}
        onClose={() => setImportExcelOpen(false)}
        onSuccess={load}
      />
      <BarcodeScanModal
        open={barcodeScanOpen}
        onClose={() => setBarcodeScanOpen(false)}
        onScan={applyScannedBarcode}
      />
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          {
            title: t('product_image'),
            dataIndex: 'image',
            width: 70,
            render: (v: string) =>
              v ? (
                <img
                  src={
                    String(v).startsWith('http')
                      ? v
                      : `${API_BASE}${String(v).startsWith('/') ? '' : '/media/'}${v}`
                  }
                  alt=""
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                />
              ) : (
                <span style={{ color: '#999', fontSize: 11 }}>—</span>
              ),
          },
          { title: t('name_en'), dataIndex: 'name_en' },
          { title: t('name_ar'), dataIndex: 'name_ar' },
          { title: t('category'), dataIndex: 'category_name_en' },
          { title: t('supplier'), dataIndex: 'supplier_name_ar', render: (_v: unknown, r: Product) => r.supplier_name_ar || r.supplier_name_en || '-' },
          {
            title: t('product_branches'),
            dataIndex: 'branches',
            render: (_v: unknown, r: Product) => {
              const ids = r.branches ?? []
              const names = ids
                .map((id) => branches.find((b) => b.id === id))
                .filter(Boolean)
                .map((b) => (i18n.language === 'ar' ? b!.name_ar : b!.name_en))
              return names.length ? names.join(', ') : '—'
            },
          },
          { title: t('place_of_manufacture'), dataIndex: 'place_of_manufacture', render: (v) => v || '-' },
          { title: t('barcode'), dataIndex: 'barcode' },
          {
            title: t('barcode'),
            dataIndex: 'barcodes',
            render: (_v: unknown, r: Product) => {
              const codes = r.barcodes ?? (r.barcode ? [r.barcode] : [])
              return codes.length ? codes.join(', ') : '—'
            },
          },
          { title: t('sku'), dataIndex: 'sku' },
          { title: t('price'), dataIndex: 'price' },
          { title: t('purchase_price'), dataIndex: 'purchase_price' },
          {
            title: t('actions'),
            render: (_, record) => (
              <Space>
                <Button onClick={() => handleEdit(record)}>{t('edit')}</Button>
                <Button onClick={() => handlePrintLabels(record)}>{t('print')}</Button>
                <Button danger onClick={() => handleDelete(record)}>
                  {t('delete')}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onCancel={() => {
          setOpen(false)
          setEditing(null)
          setImageFile(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        title={editing ? t('edit') : t('add')}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="category" label={t('category')} rules={[{ required: true }]}>
            <Select
              options={categories.map((c) => ({
                value: c.id,
                label: `${c.name_en} - ${c.name_ar}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="supplier" label={t('supplier')} rules={[{ required: true }]}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('select_supplier')}
              options={suppliers.map((s) => ({
                value: s.id,
                label: `${s.name_en} - ${s.name_ar}`,
              }))}
              popupRender={(menu) => (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  {menu}
                  <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                    <Button
                      type="link"
                      block
                      style={{ textAlign: 'start' }}
                      onClick={() => setSupplierModalOpen(true)}
                    >
                      + {t('add_new_supplier')}
                    </Button>
                  </div>
                </div>
              )}
            />
          </Form.Item>
          <Form.Item name="branches" label={t('product_branches')} initialValue={[]}>
            <Select
              mode="multiple"
              allowClear
              placeholder={t('select_branches')}
              options={branches.map((b) => ({
                value: b.id,
                label: i18n.language === 'ar' ? b.name_ar : b.name_en,
              }))}
            />
          </Form.Item>
          <Form.Item name="product_type" label={t('product_type')} initialValue="default">
            <Select
              options={[
                { value: 'default', label: t('product_type_default') },
                { value: 'pills', label: t('product_type_pills') },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.product_type !== curr.product_type}>
            {({ getFieldValue }) =>
              getFieldValue('product_type') === 'pills' && (
                <>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {t('pills_pricing')}
                  </Typography.Text>
                  <Form.Item
                    name="strips_per_box"
                    label={t('strips_per_box')}
                    rules={[
                      { required: true, message: t('err_strips_required') },
                      {
                        validator: (_, v) =>
                          v == null || v === '' || (Number(v) >= 1)
                            ? Promise.resolve()
                            : Promise.reject(t('err_values_positive')),
                      },
                    ]}
                    initialValue={1}
                  >
                    <Input type="number" min={1} />
                  </Form.Item>
                  <Form.Item
                    name="pills_per_strip"
                    label={t('pills_per_strip')}
                    rules={[
                      { required: true, message: t('err_pills_required') },
                      {
                        validator: (_, v) =>
                          v == null || v === '' || (Number(v) >= 1)
                            ? Promise.resolve()
                            : Promise.reject(t('err_values_positive')),
                      },
                    ]}
                    initialValue={1}
                  >
                    <Input type="number" min={1} />
                  </Form.Item>
                  <Form.Item
                    name="price_per_strip"
                    label={t('price_per_strip')}
                    rules={[
                      { required: true, message: t('err_price_strip_required') },
                      {
                        validator: (_, v) =>
                          v == null || v === '' || (Number(v) >= 0)
                            ? Promise.resolve()
                            : Promise.reject(t('err_values_positive')),
                      },
                    ]}
                  >
                    <Input type="number" min={0} step={0.01} />
                  </Form.Item>
                  <Form.Item
                    name="price_per_box"
                    label={t('price_per_box')}
                    rules={[
                      {
                        validator: (_, v) =>
                          v == null || v === '' || (Number(v) >= 0)
                            ? Promise.resolve()
                            : Promise.reject(t('err_values_positive')),
                      },
                    ]}
                  >
                    <Input type="number" min={0} step={0.01} />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const s = getFieldValue('strips_per_box') || 1
                      const p = getFieldValue('pills_per_strip') || 1
                      return (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {t('pills_helper')
                            .replace('{strips}', String(s))
                            .replace('{pills}', String(Number(s) * Number(p)))}
                        </Typography.Text>
                      )
                    }}
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item name="name_en" label={t('name_en')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name_ar" label={t('name_ar')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="place_of_manufacture" label={t('place_of_manufacture')}>
            <Input placeholder={t('place_of_manufacture_placeholder')} />
          </Form.Item>
          <Form.Item name="barcode" label={t('barcode')}>
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder={t('barcode_scan_placeholder')} />
              <Button icon={<QrcodeOutlined />} onClick={() => setBarcodeScanOpen(true)}>
                {t('scan_barcode')}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="barcodes" label={t('barcode')}>
            <Select
              mode="tags"
              tokenSeparators={[',', ' ']}
              placeholder={t('barcode_scan_placeholder')}
              options={[]}
            />
          </Form.Item>
          <Form.Item name="sku" label={t('sku')}>
            <Input />
          </Form.Item>
          <Form.Item
            name="price"
            label={t('price')}
            rules={[
              { required: true, message: t('err_values_positive') },
              {
                validator: (_, v) =>
                  v == null || v === '' || Number(v) >= 0
                    ? Promise.resolve()
                    : Promise.reject(t('err_values_positive')),
              },
            ]}
          >
            <Input type="number" min={0} step={0.01} />
          </Form.Item>
          <Form.Item
            name="purchase_price"
            label={t('purchase_price')}
            rules={[
              { required: true },
              {
                validator: (_, v) =>
                  v == null || v === '' || Number(v) >= 0
                    ? Promise.resolve()
                    : Promise.reject(t('err_values_positive')),
              },
            ]}
          >
            <Input type="number" min={0} step={0.01} />
          </Form.Item>
          <Form.Item
            name="min_quantity"
            label={t('min_quantity')}
            initialValue={0}
            rules={[
              {
                validator: (_, v) =>
                  v == null || v === '' || Number(v) >= 0
                    ? Promise.resolve()
                    : Promise.reject(t('err_values_positive')),
              },
            ]}
          >
            <Input type="number" min={0} placeholder={t('min_quantity_help')} />
          </Form.Item>
          <Form.Item label={t('product_image')}>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {editing?.image && !imageFile && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={
                    String(editing.image).startsWith('http')
                      ? editing.image
                      : `${API_BASE}${String(editing.image).startsWith('/') ? '' : '/media/'}${editing.image}`
                  }
                  alt=""
                  style={{ maxHeight: 80 }}
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={supplierModalOpen}
        onCancel={() => {
          setSupplierModalOpen(false)
          supplierForm.resetFields()
        }}
        onOk={() => supplierForm.submit()}
        title={t('add_new_supplier')}
      >
        <Form form={supplierForm} layout="vertical" onFinish={handleCreateSupplier}>
          <Form.Item name="name_en" label={t('name_en')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name_ar" label={t('name_ar')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('address')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Products
