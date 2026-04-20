import { UploadOutlined } from '@ant-design/icons'
import { Button, Modal, Upload, message } from 'antd'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const REGION_ID = 'eid-admin-barcode-scan-region'

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
]

type Props = {
  open: boolean
  onClose: () => void
  onScan: (text: string) => void
}

export default function BarcodeScanModal({ open, onClose, onScan }: Props) {
  const { t } = useTranslation()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const onCloseRef = useRef(onClose)
  onScanRef.current = onScan
  onCloseRef.current = onClose

  const stopScanner = async () => {
    const s = scannerRef.current
    scannerRef.current = null
    if (s?.isScanning) {
      try {
        await s.stop()
      } catch {
        /* ignore */
      }
    }
    try {
      s?.clear()
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!open) {
      void stopScanner()
      return
    }

    let cancelled = false
    const start = async () => {
      await new Promise((r) => setTimeout(r, 200))
      if (cancelled) return
      const el = document.getElementById(REGION_ID)
      if (!el) return
      try {
        const html5 = new Html5Qrcode(REGION_ID, {
          verbose: false,
          formatsToSupport: FORMATS,
        })
        scannerRef.current = html5
        await html5.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.777778,
          },
          (decodedText) => {
            if (cancelled) return
            const text = decodedText.trim()
            if (!text) return
            void stopScanner()
            onScanRef.current(text)
            onCloseRef.current()
          },
          () => {}
        )
        if (cancelled) {
          await html5.stop().catch(() => {})
        }
      } catch {
        if (!cancelled) {
          message.error(t('scan_camera_error'))
        }
      }
    }
    void start()

    return () => {
      cancelled = true
      void stopScanner()
    }
  }, [open, t])

  const scanFromFile = async (file: File) => {
    const hid = document.createElement('div')
    const id = `eid-scan-tmp-${Date.now()}`
    hid.id = id
    hid.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden'
    document.body.appendChild(hid)
    try {
      const html5 = new Html5Qrcode(id, { verbose: false, formatsToSupport: FORMATS })
      const text = (await html5.scanFile(file, false)).trim()
      if (!text) {
        message.warning(t('scan_file_no_code'))
        return
      }
      await stopScanner()
      onScan(text)
      onClose()
    } catch {
      message.error(t('scan_file_error'))
    } finally {
      document.body.removeChild(hid)
    }
  }

  return (
    <Modal
      title={t('scan_barcode_title')}
      open={open}
      onCancel={() => {
        void stopScanner()
        onClose()
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Upload accept="image/*" showUploadList={false} beforeUpload={(file) => void scanFromFile(file)}>
            <Button icon={<UploadOutlined />}>{t('scan_from_image')}</Button>
          </Upload>
          <Button
            onClick={() => {
              void stopScanner()
              onClose()
            }}
          >
            {t('cancel')}
          </Button>
        </div>
      }
      width={420}
      destroyOnHidden
    >
      <p style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>{t('scan_barcode_hint')}</p>
      <div
        id={REGION_ID}
        style={{
          width: '100%',
          minHeight: 260,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#111',
        }}
      />
      <p style={{ marginTop: 12, color: '#999', fontSize: 12 }}>{t('scan_hardware_hint')}</p>
    </Modal>
  )
}
