import { Button, Form, Input, Modal, Select, Space, Table, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { exportToPdf, printTable } from '../utils/exportUtils'

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
  sku: string
  price: number
  purchase_price: number
  min_quantity: number
  image?: string
  place_of_manufacture?: string
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
  const [form] = Form.useForm<Product>()

  const load = async () => {
    const res = await api.get('/products/')
    setItems(res.data)
  }

  useEffect(() => {
    load()
    api.get('/categories/').then((res) => setCategories(res.data))
    api.get('/suppliers/').then((res) => setSuppliers(res.data))
    api.get('/branches/').then((res) => setBranches(res.data))
  }, [])

  const handleSubmit = async (values: Product) => {
    try {
      const payload = { ...values }
      const branchesArr = payload.branches ?? []
      const appendPayload = (fd: FormData, p: Record<string, unknown>) => {
        Object.entries(p).forEach(([k, v]) => {
          if (k === 'branches') return
          if (v != null && v !== '') fd.append(k, String(v))
        })
        fd.append('branches', JSON.stringify(branchesArr))
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
    })
  }

  const handleDelete = async (record: Product) => {
    await api.delete(`/products/${record.id}/`)
    load()
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
      <Space style={{ marginBottom: 16 }} wrap>
        <Typography.Title level={3}>{t('products')}</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          {t('add')}
        </Button>
        <Button onClick={handlePrint}>{t('print')}</Button>
        <Button onClick={handleExportPdf}>{t('export_pdf')}</Button>
      </Space>
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
                  src={`http://localhost:8000${v.startsWith('/') ? '' : '/media/'}${v}`}
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
          { title: t('sku'), dataIndex: 'sku' },
          { title: t('price'), dataIndex: 'price' },
          { title: t('purchase_price'), dataIndex: 'purchase_price' },
          {
            title: t('actions'),
            render: (_, record) => (
              <Space>
                <Button onClick={() => handleEdit(record)}>{t('edit')}</Button>
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
              placeholder={t('select_supplier')}
              options={suppliers.map((s) => ({
                value: s.id,
                label: `${s.name_en} - ${s.name_ar}`,
              }))}
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
            <Input />
          </Form.Item>
          <Form.Item name="sku" label={t('sku')}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label={t('price')} rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="purchase_price"
            label={t('purchase_price')}
            rules={[{ required: true }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="min_quantity"
            label={t('min_quantity')}
            initialValue={0}
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
                  src={`http://localhost:8000${editing.image.startsWith('/') ? '' : '/media/'}${editing.image}`}
                  alt=""
                  style={{ maxHeight: 80 }}
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Products
