import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Upload, Edit2, Trash2, Image as ImageIcon } from 'lucide-react'
import api from '../../lib/api'
import styles from './ProductDetail.module.styl'

export default function ProductDetail () {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    typeId: 'SKIN_CARE_04',
    descriptionMd: ''
  })

  const fallbackProduct = {
    name: 'Glow Serum',
    slug: 'glow-serum-v1',
    description: 'A hyper-concentrated luminizing treatment formulated with synthesized pearl essence and high-frequency vitamins for maximum radiance.',
    category: 'SKIN_CARE_04',
    variants: [
      { id: 'GS-001-LIME', colorHex: '#8df179', price: 45.00, inventory: 1240 },
    ]
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        if (id && id !== 'new') {
          const res = await api.get(`/admin/products/${id}`)
          setProduct(res || fallbackProduct)
        } else {
          setProduct(fallbackProduct)
        }
      } catch (err) {
        console.warn('API error, using fallback data for mock-up', err)
        setProduct(fallbackProduct)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        typeId: product.typeId || product.category || 'SKIN_CARE_04',
        descriptionMd: product.descriptionMd || product.description || ''
      })
    }
  }, [product])

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = { ...formData, isActive: true, isCustomizable: false }
      
      if (id === 'new') {
        payload.variants = (product?.variants || []).map(v => ({
          sku: v.sku || v.id || `SKU-${Date.now()}`,
          price: v.price || 0,
          stockQuantity: v.stockQuantity || v.inventory || 0,
          isActive: true,
          options: []
        }))
        await api.post('/admin/products', payload)
        alert('CREATED MAINFRAME RECORD')
      } else {
        await api.put(`/admin/products/${id}`, payload)
        alert('SAVED TO MAINFRAME')
      }
    } catch (err) {
      console.error(err)
      alert('SAVE FAILED - SYS_ERROR')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || id === 'new') {
      alert(id === 'new' ? 'MUST_SAVE_RECORD_BEFORE_UPLOAD' : 'NO_FILE_DETECTED')
      return
    }
    try {
      setUploading(true)
      const data = new FormData()
      data.append('file', file)
      data.append('type', 'IMAGE')
      await api.post(`/admin/products/${id}/media`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('UPLOAD SUCCESS_SYMLINK_CREATED')
      // reload or re-fetch gracefully here in real-app
    } catch(err) {
      console.error(err)
      alert('UPLOAD_FAILED')
    } finally {
      setUploading(false)
    }
  }

  if (loading || !product) {
    return <div className="p-8 text-primary font-mono text-sm animate-pulse tracking-widest">INITIALIZING_PRODUCT_DATASTREAMS...</div>
  }

  return (
    <div className={styles.container}>
      
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <span>CATALOG</span> &gt; <span>SKINCARE</span> &gt; <span className={styles.breadcrumbActive}>SERUMS</span>
      </div>

      {/* Header */}
      <div className={styles.headerRow}>
        <h1 className={styles.title}>
          GLOW<br/>SERUM
        </h1>
        <div className={styles.actions}>
          <Link to="/products">
            <button className={styles.discardBtn}>DISCARD<br/>CHANGES</button>
          </Link>
          <button 
            className={`${styles.commitBtn} crt-scanline-green ${saving ? 'opacity-50' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'SYNCING...' : 'COMMIT TO'}<br/>{saving ? 'SYS' : 'MAINFRAME'}
          </button>
        </div>
      </div>

      <div className={styles.mainGrid}>
        
        {/* Left Column */}
        <div className={styles.leftCol}>
          
          {/* Box 1: Basic Identity */}
          <div className={styles.terminalBox}>
            <div className={styles.badgeTag}>SECTION: 01_BASIC_IDENTITY</div>
            
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>PRODUCT_NAME</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>URL_SLUG</label>
                  <div className={styles.inputPrefix}>
                    <span className={styles.prefixSpan}>/PROD/</span>
                    <input 
                      type="text" 
                      className={`${styles.input} ${styles.inputWithPrefix}`} 
                      value={formData.slug}
                      onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>CATEGORY_ID</label>
                  <select 
                    className={styles.input} 
                    value={formData.typeId}
                    onChange={e => setFormData(p => ({ ...p, typeId: e.target.value }))}
                  >
                    <option value="SKIN_CARE_04">SKIN_CARE_04</option>
                    <option value="COSMETIC_BASE">COSMETIC_BASE</option>
                  </select>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>DATA_DESCRIPTION</label>
                <textarea 
                  className={`${styles.input} ${styles.textarea}`} 
                  value={formData.descriptionMd}
                  onChange={e => setFormData(p => ({ ...p, descriptionMd: e.target.value }))}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Box 2: Variant Buffer */}
          <div className={styles.terminalBox}>
            <div className={styles.variantHeader}>
              <h2 className={styles.variantTitle}>VARIANT_BUFFER</h2>
              <button className={styles.addVariantBtn}>+ ADD_VARIANT</button>
            </div>

            <div>
              <div className={styles.tableHeader}>
                <div>SKU_ID</div>
                <div>COLOR</div>
                <div>PRICE</div>
                <div>STOCK</div>
                <div className="text-right">ACTIONS</div>
              </div>
              
              {(product.variants || []).map((variant, idx) => (
                <div key={idx} className={styles.tableRow}>
                  <div className={styles.skuValue}>{variant.id}</div>
                  <div>
                    <div className="w-4 h-4" style={{ backgroundColor: variant.colorHex, border: '1px solid #444' }}></div>
                  </div>
                  <div className="text-white">${(variant?.price || 0).toFixed(2)}</div>
                  <div className="text-white">{(variant?.inventory || variant?.stockQuantity || variant?.stock || 0).toLocaleString()}</div>
                  <div className="flex justify-end gap-4 text-muted-foreground">
                    <Edit2 className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                    <Trash2 className="w-4 h-4 cursor-pointer hover:text-[#ff5555] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          
          {/* Visual Assets Box */}
          <div className={styles.terminalBox}>
            <div className={styles.visualHeader}>
              <h2 className={styles.visualTitle}>VISUAL_ASSETS</h2>
              <label className={`${styles.uploadBtn} ${uploading || id === 'new' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading || id === 'new'} />
                <Upload className="w-3 h-3" /> {uploading ? 'UPLOADING...' : 'UPLOAD_PIXELS'}
              </label>
            </div>

            {/* Main Render Area */}
            <div className={styles.renderContainer}>
              <div className="absolute inset-0 crt-scanline z-0 opacity-40"></div>
              {/* Fake interior geometry drawing */}
              <div className="w-3/4 h-8 bg-[#333] absolute bottom-8"></div>
              <div className="w-full h-1 bg-[#444] absolute bottom-16"></div>
              
              <div className={styles.renderText}>
                PRIMARY<br/>PRODUCT<br/>WORK
              </div>
              
              <div className={styles.exeBadge}>
                PRIMARY_RENDER.EXE
              </div>
            </div>

            {/* Thumbnails */}
            <div className={styles.thumbnailGrid}>
              <div className={`${styles.thumbBox} ${styles.active}`}>
                <div className="absolute inset-0 crt-scanline opacity-20"></div>
                <div className="w-[20%] h-[60%] bg-[#333]"></div>
              </div>
              <div className={styles.thumbBox} style={{ background: 'linear-gradient(to bottom, #111, #441111)' }}>
                <div className="absolute inset-0 crt-scanline opacity-40"></div>
              </div>
              <div className={styles.thumbBox} style={{ background: 'linear-gradient(to bottom, #111, #222)' }}>
                <div className="absolute inset-0 crt-scanline opacity-40"></div>
              </div>
              <div className={`${styles.thumbBox} hover:bg-surface-container transition-colors`}>
                <ImageIcon className="text-muted-foreground w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Metadata Box */}
          <div className={styles.metaBox}>
            <div className={styles.metaRow}>
              <span>CREATED_AT:</span>
              <span className="text-white">20XX.10.24_14:20:00</span>
            </div>
            <div className={styles.metaRow} style={{ marginTop: '16px' }}>
              <span>LAST_MOD:</span>
              <span className={styles.metaValuePink}>20XX.11.02_09:12:11</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
