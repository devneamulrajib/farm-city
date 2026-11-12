import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CATEGORY_ICON_KEYS, CategoryGlyph, resolveIconKey } from '../components/CategoryIcon.jsx';
import { logoSrc } from '../components/Logo.jsx';
import { Button, Field, Modal, Notice } from '../components/ui/primitives.jsx';
import { adminApi, catalogApi } from '../services/resources.js';
import { apiError, dhaka, idOf, lx, media, money } from '../utils/format.js';

const AdminBrandContext = createContext(() => {});

const links = [
  ['/admin', 'overview', true],
  ['/admin/products', 'products'],
  ['/admin/categories', 'categories'],
  ['/admin/orders', 'orders'],
  ['/admin/customers', 'customers'],
  ['/admin/promotions', 'promotions'],
  ['/admin/settings', 'settings'],
];

export function AdminLayout() {
  const { t } = useTranslation();
  const [brand, setBrand] = useState({ logo: null, storeName: 'Farm City' });
  useEffect(() => {
    catalogApi.settings().then((res) => {
      setBrand({ logo: res.data?.logo?.url ? res.data.logo : null, storeName: res.data?.storeName || 'Farm City' });
    }).catch(() => {});
  }, []);
  return (
    <AdminBrandContext.Provider value={setBrand}>
    <div className="min-h-screen bg-sand/40 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-ocean-900/10 bg-ocean-950 text-sand lg:min-h-screen lg:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link to="/admin" className="min-w-0">
            <img src={logoSrc(brand.logo)} alt={brand.storeName || 'Farm City'} className="h-9 w-auto max-w-[6.75rem] object-contain" />
          </Link>
          <Link to="/" className="shrink-0 text-xs text-sand/70">{t('admin.backShop')}</Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:block lg:space-y-1 lg:px-3">
          {links.map(([to, key, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `block whitespace-nowrap rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-white text-ocean-950' : 'text-sand/80 hover:bg-white/10'}`}>{t(`admin.${key}`)}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="p-4 sm:p-6"><Outlet /></div>
    </div>
    </AdminBrandContext.Provider>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { adminApi.overview().then((res) => setData(res.data)).catch((err) => setError(apiError(err))); }, []);
  if (error) return <Notice>{error}</Notice>;
  if (!data) return null;
  const max = Math.max(...data.chart.map((day) => day.total), 1);
  const cards = [
    [t('admin.sales'), money(data.sales)],
    [t('admin.orders'), data.orders],
    [t('admin.customers'), data.customers],
    [t('admin.products'), data.products],
    [t('admin.pending'), data.pending],
  ];
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{t('admin.overview')}</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4"><p className="text-xs uppercase tracking-wide text-ocean-900/50">{label}</p><p className="mt-2 font-display text-2xl">{value}</p></div>)}
      </div>
      <div className="rounded-3xl bg-white p-4">
        <h2 className="font-medium">{t('admin.chart')}</h2>
        <div className="mt-4 flex h-40 items-end gap-1">
          {data.chart.map((day) => (
            <div key={day.date} className="flex h-full flex-1 items-end" title={`${day.date}: ${money(day.total)} (${day.orders})`}>
              <div className="w-full rounded-t bg-ocean-700" style={{ height: `${Math.max(6, (day.total / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ocean-900/50">{data.chart[0]?.date} — {data.chart.at(-1)?.date}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-4">
          <h2 className="font-medium">{t('admin.low')}</h2>
          {data.lowStock.map((product) => <p key={product._id} className="mt-2 text-sm">{lx(product.name, i18n.language)} · {product.stock} {product.unit}</p>)}
          {data.lowStock.length === 0 ? <p className="mt-2 text-sm text-ocean-900/60">{t('common.empty')}</p> : null}
        </div>
        <div className="rounded-3xl bg-white p-4">
          <h2 className="font-medium">{t('admin.recent')}</h2>
          {data.recentOrders.map((order) => <Link key={order._id} to={`/admin/orders/${order._id}`} className="mt-2 flex justify-between text-sm"><span>{order.orderNumber}</span><span>{money(order.total)}</span></Link>)}
        </div>
      </div>
    </div>
  );
}

const emptyProduct = {
  name: { en: '', bn: '' }, description: { en: '', bn: '' }, categoryId: '', categoryIds: [], images: [],
  basePrice: '', compareAtPrice: '', unit: 'kg', stock: 0, isAvailable: true, variants: [],
  allowCustomQuantity: true, minQuantity: 0.5, maxQuantity: 5, quantityStep: 0.5, attributes: {},
  isFeatured: false, isBestSeller: false, isNewArrival: false, tags: '', sku: '',
};

export function ProductFormPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [error, setError] = useState('');
  useEffect(() => { adminApi.categories().then((res) => setCategories(res.data.flat)); }, []);
  useEffect(() => {
    if (!id) return;
    adminApi.product(id).then((res) => {
      const product = res.data;
      setForm({
        ...emptyProduct,
        ...product,
        categoryId: product.category?._id || product.category,
        categoryIds: (product.categories || []).map((item) => item._id || item).filter((item) => String(item) !== String(product.category?._id || product.category)),
        compareAtPrice: product.compareAtPrice || '',
        tags: (product.tags || []).join(', '),
        variants: (product.variants || []).map((variant) => ({ ...variant, _id: variant.id })),
      });
    });
  }, [id]);
  const category = categories.find((item) => String(item._id) === String(form.categoryId));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const res = await adminApi.upload(file);
      set('images', [...form.images, { ...res.data, alt: form.name.en }]);
    } catch (err) { toast.error(apiError(err)); }
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    const payload = {
      ...form,
      basePrice: Number(form.basePrice),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      stock: Number(form.stock),
      minQuantity: Number(form.minQuantity),
      maxQuantity: Number(form.maxQuantity),
      quantityStep: Number(form.quantityStep),
      tags: String(form.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      variants: form.variants.map((variant) => ({
        ...variant,
        weightValue: Number(variant.weightValue),
        price: Number(variant.price),
        stock: Number(variant.stock),
        compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
      })),
      categoryIds: form.categoryIds,
    };
    try {
      await adminApi.saveProduct(payload, id);
      toast.success(t('admin.saveProduct'));
      navigate('/admin/products');
    } catch (err) { setError(apiError(err)); }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-4xl">{id ? t('admin.editProduct') : t('admin.newProduct')}</h1>
      {error ? <Notice>{error}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('admin.nameEn')}><input className="field" required value={form.name.en} onChange={(event) => set('name', { ...form.name, en: event.target.value })} /></Field>
        <Field label={t('admin.nameBn')}><input className="field" value={form.name.bn} onChange={(event) => set('name', { ...form.name, bn: event.target.value })} /></Field>
        <Field label={t('admin.descEn')}><textarea className="field" required rows="4" value={form.description.en} onChange={(event) => set('description', { ...form.description, en: event.target.value })} /></Field>
        <Field label={t('admin.descBn')}><textarea className="field" rows="4" value={form.description.bn} onChange={(event) => set('description', { ...form.description, bn: event.target.value })} /></Field>
      </div>
      <Field label={t('admin.category')}>
        <select className="field" required value={form.categoryId} onChange={(event) => set('categoryId', event.target.value)}>
          <option value="">{t('cart.choose')}</option>
          {categories.map((item) => <option key={item._id} value={item._id}>{lx(item.name, i18n.language)}</option>)}
        </select>
      </Field>
      <fieldset>
        <legend className="text-sm font-medium">{t('admin.also')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.filter((item) => String(item._id) !== String(form.categoryId)).map((item) => {
            const checked = form.categoryIds.map(String).includes(String(item._id));
            return <label key={item._id} className="rounded-full border px-3 py-1 text-sm"><input type="checkbox" className="mr-2" checked={checked} onChange={() => set('categoryIds', checked ? form.categoryIds.filter((idValue) => String(idValue) !== String(item._id)) : [...form.categoryIds, item._id])} />{lx(item.name, i18n.language)}</label>;
          })}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('admin.price')}><input className="field" type="number" min="1" step="0.01" required value={form.basePrice} onChange={(event) => set('basePrice', event.target.value)} /></Field>
        <Field label={t('admin.compare')}><input className="field" type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(event) => set('compareAtPrice', event.target.value)} /></Field>
        <Field label={t('admin.unit')}><select className="field" value={form.unit} onChange={(event) => set('unit', event.target.value)}>{['kg', 'gram', 'piece', 'pack'].map((unit) => <option key={unit}>{unit}</option>)}</select></Field>
        <Field label={t('admin.stock')}><input className="field" type="number" min="0" step="0.1" value={form.stock} onChange={(event) => set('stock', event.target.value)} /></Field>
        <Field label={t('admin.sku')}><input className="field" value={form.sku} onChange={(event) => set('sku', event.target.value)} /></Field>
        <Field label={t('admin.tags')}><input className="field" value={form.tags} onChange={(event) => set('tags', event.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowCustomQuantity} onChange={(event) => set('allowCustomQuantity', event.target.checked)} />{t('admin.custom')}</label>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('admin.min')}><input className="field" type="number" step="0.1" value={form.minQuantity} onChange={(event) => set('minQuantity', event.target.value)} /></Field>
        <Field label={t('admin.max')}><input className="field" type="number" step="0.1" value={form.maxQuantity} onChange={(event) => set('maxQuantity', event.target.value)} /></Field>
        <Field label={t('admin.step')}><input className="field" type="number" step="0.1" value={form.quantityStep} onChange={(event) => set('quantityStep', event.target.value)} /></Field>
      </div>
      <div>
        <div className="flex items-center justify-between"><h2 className="font-medium">{t('admin.variants')}</h2><Button type="button" variant="outline" onClick={() => set('variants', [...form.variants, { label: '', weightValue: 1, weightUnit: form.unit, price: '', stock: 0, isDefault: form.variants.length === 0 }])}>{t('admin.addVariant')}</Button></div>
        {form.variants.map((variant, index) => (
          <div key={variant._id || index} className="mt-2 grid gap-2 rounded-2xl bg-white p-3 sm:grid-cols-6">
            <input className="field" placeholder="500g" value={variant.label} onChange={(event) => { const variants = [...form.variants]; variants[index] = { ...variant, label: event.target.value }; set('variants', variants); }} />
            <input className="field" type="number" step="0.01" value={variant.weightValue} onChange={(event) => { const variants = [...form.variants]; variants[index] = { ...variant, weightValue: event.target.value }; set('variants', variants); }} />
            <select className="field" value={variant.weightUnit} onChange={(event) => { const variants = [...form.variants]; variants[index] = { ...variant, weightUnit: event.target.value }; set('variants', variants); }}>{['kg', 'gram', 'piece', 'pack'].map((unit) => <option key={unit}>{unit}</option>)}</select>
            <input className="field" type="number" placeholder={t('admin.price')} value={variant.price} onChange={(event) => { const variants = [...form.variants]; variants[index] = { ...variant, price: event.target.value }; set('variants', variants); }} />
            <input className="field" type="number" placeholder={t('admin.stock')} value={variant.stock} onChange={(event) => { const variants = [...form.variants]; variants[index] = { ...variant, stock: event.target.value }; set('variants', variants); }} />
            <button type="button" className="text-sm text-red-700" onClick={() => set('variants', form.variants.filter((_, item) => item !== index))}>{t('common.delete')}</button>
          </div>
        ))}
      </div>
      {category ? (
        <div className="space-y-3">
          <h2 className="font-medium">{t('admin.attrs')}</h2>
          {category.attributeSchema.map((field) => (
            <Field key={field.key} label={`${lx(field.label, i18n.language)}${field.required ? ' *' : ''}`}>
              {field.type === 'select' ? (
                <select className="field" value={form.attributes[field.key] || ''} onChange={(event) => set('attributes', { ...form.attributes, [field.key]: event.target.value })}>
                  <option value="" />
                  {field.options.map((option) => <option key={option.value} value={option.value}>{lx(option.label, i18n.language)}</option>)}
                </select>
              ) : field.type === 'boolean' ? (
                <input type="checkbox" checked={Boolean(form.attributes[field.key])} onChange={(event) => set('attributes', { ...form.attributes, [field.key]: event.target.checked })} />
              ) : (
                <input className="field" type={field.type === 'number' ? 'number' : 'text'} value={form.attributes[field.key] || ''} onChange={(event) => set('attributes', { ...form.attributes, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value })} />
              )}
            </Field>
          ))}
        </div>
      ) : null}
      <div>
        <h2 className="font-medium">{t('admin.images')}</h2>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 text-sm" onChange={upload} />
        <div className="mt-3 flex gap-2">{form.images.map((image) => <img key={image.url} src={media(image.url)} alt="" className="h-20 w-20 rounded-xl object-cover" />)}</div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label><input type="checkbox" checked={form.isAvailable} onChange={(event) => set('isAvailable', event.target.checked)} className="mr-2" />{t('admin.available')}</label>
        <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => set('isFeatured', event.target.checked)} className="mr-2" />{t('admin.featured')}</label>
        <label><input type="checkbox" checked={form.isBestSeller} onChange={(event) => set('isBestSeller', event.target.checked)} className="mr-2" />{t('admin.best')}</label>
        <label><input type="checkbox" checked={form.isNewArrival} onChange={(event) => set('isNewArrival', event.target.checked)} className="mr-2" />{t('admin.new')}</label>
      </div>
      <Button type="submit">{t('admin.saveProduct')}</Button>
    </form>
  );
}

export function ProductsAdminPage() {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  function load(search = q) { adminApi.products({ q: search, limit: 40 }).then((res) => setRows(res.data)); }
  useEffect(() => { load(''); }, []);
  async function remove(id) {
    if (!window.confirm(t('common.delete'))) return;
    await adminApi.deleteProduct(id);
    load();
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{t('admin.products')}</h1>
        <Button asChild><Link to="/admin/products/new">{t('admin.newProduct')}</Link></Button>
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); load(); }}>
        <input className="field max-w-sm" value={q} onChange={(event) => setQ(event.target.value)} placeholder={t('common.search')} />
        <Button type="submit" variant="outline">{t('common.search')}</Button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((product) => (
              <tr key={product.id} className="border-b border-ocean-900/10">
                <td className="p-3"><img src={media(product.images?.[0]?.url)} alt="" className="h-12 w-12 rounded-lg object-cover" /></td>
                <td className="p-3">{lx(product.name, i18n.language)}<span className="block text-xs text-ocean-900/50">{product.availability}</span></td>
                <td className="p-3">{money(product.basePrice)}</td>
                <td className="p-3 text-right"><Link className="mr-3 underline" to={`/admin/products/${product.id}`}>{t('common.edit')}</Link><button type="button" className="text-red-700" onClick={() => remove(product.id)}>{t('common.delete')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const emptyCategory = { name: { en: '', bn: '' }, description: { en: '', bn: '' }, parentId: null, isVisible: true, isFeatured: false, sortOrder: 0, attributeSchema: [], image: null, icon: 'fish', iconImage: null };

export function CategoriesAdminPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCategory);
  const [editing, setEditing] = useState(null);
  function load() { adminApi.categories().then((res) => setRows(res.data.flat)); }
  useEffect(load, []);
  function edit(category) {
    setEditing(category._id);
    setForm({
      name: category.name,
      description: category.description || { en: '', bn: '' },
      parentId: category.parent || null,
      isVisible: category.isVisible,
      isFeatured: category.isFeatured,
      sortOrder: category.sortOrder || 0,
      attributeSchema: category.attributeSchema || [],
      image: category.image?.url ? category.image : null,
      icon: resolveIconKey(category),
      iconImage: category.iconImage?.url ? category.iconImage : null,
    });
    setOpen(true);
  }
  async function save(event) {
    event.preventDefault();
    try {
      await adminApi.saveCategory({ ...form, parentId: form.parentId || null }, editing);
      setOpen(false);
      load();
    } catch (error) { toast.error(apiError(error)); }
  }
  return (
    <div>
      <div className="flex justify-between"><h1 className="font-display text-4xl">{t('admin.categories')}</h1><Button onClick={() => { setEditing(null); setForm(emptyCategory); setOpen(true); }}>{t('admin.newCategory')}</Button></div>
      <div className="mt-4 space-y-2">{rows.map((category) => (
        <div key={category._id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
          <span>{category.parent ? '↳ ' : ''}{lx(category.name, i18n.language)} <span className="text-xs text-ocean-900/50">{category.attributeSchema?.length || 0} attrs</span></span>
          <span><button type="button" className="mr-3 text-sm underline" onClick={() => edit(category)}>{t('common.edit')}</button><button type="button" className="text-sm text-red-700" onClick={async () => { try { await adminApi.deleteCategory(category._id); load(); } catch (error) { toast.error(apiError(error)); } }}>{t('common.delete')}</button></span>
        </div>
      ))}</div>
      <Modal open={open} onOpenChange={setOpen} title={editing ? t('common.edit') : t('admin.newCategory')}>
        <form onSubmit={save} className="space-y-3">
          <Field label={t('admin.nameEn')}><input className="field" required value={form.name.en} onChange={(event) => setForm({ ...form, name: { ...form.name, en: event.target.value } })} /></Field>
          <Field label={t('admin.nameBn')}><input className="field" value={form.name.bn} onChange={(event) => setForm({ ...form, name: { ...form.name, bn: event.target.value } })} /></Field>
          <Field label={t('admin.parent')}><select className="field" value={form.parentId || ''} onChange={(event) => setForm({ ...form, parentId: event.target.value || null })}><option value="">{t('admin.none')}</option>{rows.filter((row) => row._id !== editing).map((row) => <option key={row._id} value={row._id}>{lx(row.name, i18n.language)}</option>)}</select></Field>
          <label className="flex gap-4 text-sm"><span><input type="checkbox" checked={form.isVisible} onChange={(event) => setForm({ ...form, isVisible: event.target.checked })} className="mr-2" />{t('admin.visible')}</span><span><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} className="mr-2" />{t('admin.featured')}</span></label>
          <div>
            <p className="text-sm font-medium">{t('admin.icon')}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {CATEGORY_ICON_KEYS.map((key) => (
                <button key={key} type="button" aria-label={key} aria-pressed={!form.iconImage && form.icon === key} onClick={() => setForm({ ...form, icon: key, iconImage: null })} className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 ${!form.iconImage && form.icon === key ? 'border-ocean-800 bg-ocean-50' : 'border-ocean-950/10 bg-white'}`}>
                  <CategoryGlyph name={key} className="h-12 w-12" />
                  <span className="text-center text-[10px] capitalize leading-tight text-ocean-900/70">{key}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs text-ocean-900/70">{t('admin.iconUpload')}
              <input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" className="mt-1 block text-sm" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const res = await adminApi.upload(file);
                  setForm({ ...form, iconImage: { ...res.data, alt: form.name.en } });
                } catch (error) { toast.error(apiError(error)); }
              }} />
            </label>
            {form.iconImage?.url ? <button type="button" className="mt-2 text-xs underline" onClick={() => setForm({ ...form, iconImage: null })}>{t('admin.iconClear')}</button> : null}
          </div>
          <div>
            <div className="flex justify-between"><p className="text-sm font-medium">{t('admin.schema')}</p><button type="button" className="text-sm underline" onClick={() => setForm({ ...form, attributeSchema: [...form.attributeSchema, { key: '', label: { en: '', bn: '' }, type: 'text', options: [], required: false, filterable: false }] })}>{t('admin.addField')}</button></div>
            {form.attributeSchema.map((field, index) => (
              <div key={index} className="mt-2 grid gap-2 rounded-2xl bg-sand p-3">
                <input className="field" placeholder={t('admin.key')} value={field.key} onChange={(event) => { const attributeSchema = [...form.attributeSchema]; attributeSchema[index] = { ...field, key: event.target.value }; setForm({ ...form, attributeSchema }); }} />
                <input className="field" placeholder={t('admin.nameEn')} value={field.label.en} onChange={(event) => { const attributeSchema = [...form.attributeSchema]; attributeSchema[index] = { ...field, label: { ...field.label, en: event.target.value } }; setForm({ ...form, attributeSchema }); }} />
                <select className="field" value={field.type} onChange={(event) => { const attributeSchema = [...form.attributeSchema]; attributeSchema[index] = { ...field, type: event.target.value }; setForm({ ...form, attributeSchema }); }}>{['text', 'number', 'select', 'multiselect', 'boolean'].map((type) => <option key={type}>{type}</option>)}</select>
                {['select', 'multiselect'].includes(field.type) ? <textarea className="field" rows="3" placeholder={t('admin.options')} value={(field.options || []).map((option) => `${option.value}|${option.label.en}|${option.label.bn || ''}`).join('\n')} onChange={(event) => {
                  const options = event.target.value.split('\n').filter(Boolean).map((line) => { const [value, en, bn] = line.split('|'); return { value: (value || '').trim(), label: { en: (en || value || '').trim(), bn: (bn || '').trim() } }; });
                  const attributeSchema = [...form.attributeSchema];
                  attributeSchema[index] = { ...field, options };
                  setForm({ ...form, attributeSchema });
                }} /> : null}
                <label className="text-xs"><input type="checkbox" checked={field.required} onChange={(event) => { const attributeSchema = [...form.attributeSchema]; attributeSchema[index] = { ...field, required: event.target.checked }; setForm({ ...form, attributeSchema }); }} className="mr-1" />{t('admin.fieldRequired')}</label>
                <label className="text-xs"><input type="checkbox" checked={field.filterable} onChange={(event) => { const attributeSchema = [...form.attributeSchema]; attributeSchema[index] = { ...field, filterable: event.target.checked }; setForm({ ...form, attributeSchema }); }} className="mr-1" />{t('admin.filterable')}</label>
              </div>
            ))}
          </div>
          <Button type="submit">{t('common.save')}</Button>
        </form>
      </Modal>
    </div>
  );
}

const NEXT = { Pending: ['Confirmed', 'Cancelled'], Confirmed: ['Processing', 'Cancelled'], Processing: ['Out for Delivery', 'Cancelled'], 'Out for Delivery': ['Delivered', 'Cancelled'], Delivered: [], Cancelled: [] };

export function OrdersAdminPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  function load() { adminApi.orders({ q, status, limit: 30 }).then((res) => setRows(res.data)); }
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">{t('admin.orders')}</h1>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); load(); }}>
        <input className="field max-w-xs" placeholder={t('admin.searchOrders')} value={q} onChange={(event) => setQ(event.target.value)} />
        <select className="field max-w-[180px]" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('list.any')}</option>{Object.keys(NEXT).map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}</select>
        <Button type="submit" variant="outline">{t('common.search')}</Button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        {rows.map((order) => <Link key={order._id} to={`/admin/orders/${order._id}`} className="flex items-center justify-between border-b border-ocean-900/10 px-4 py-3 text-sm"><span>{order.orderNumber}<span className="block text-xs text-ocean-900/50">{order.customer?.name} · {order.customer?.phone}</span></span><span>{t(`status.${order.status}`)} · {money(order.total)}</span></Link>)}
      </div>
    </div>
  );
}

export function OrderAdminPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { adminApi.order(id).then((res) => { setOrder(res.data); setStatus((NEXT[res.data.status] || [])[0] || ''); }); }, [id]);
  async function update(event) {
    event.preventDefault();
    try {
      const res = await adminApi.status(id, { status, note });
      setOrder(res.data);
      setStatus((NEXT[res.data.status] || [])[0] || '');
      toast.success(t('admin.updateStatus'));
    } catch (error) { toast.error(apiError(error)); }
  }
  if (!order) return null;
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-4xl">{order.orderNumber}</h1>
      <p>{order.customer?.name} · {order.customer?.phone} · {order.customer?.email}</p>
      <p className="text-sm">{order.shippingAddress?.addressLine}, {order.shippingAddress?.area} {order.shippingAddress?.district}</p>
      {order.items.map((item) => <p key={item._id} className="text-sm">{lx(item.name, i18n.language)} · {item.variantLabel} × {item.quantity} · {money(item.lineTotal)} <span className="text-ocean-900/50">@ {money(item.unitPrice)}</span></p>)}
      <p className="font-medium">Total {money(order.total)} · {t(`pay.${order.paymentMethod}`)} · {order.paymentStatus}</p>
      <ol className="space-y-2 text-sm">{order.statusHistory.map((entry, index) => <li key={index}>{t(`status.${entry.status}`)} · {dhaka(entry.at, i18n.language)} {entry.note}</li>)}</ol>
      {(NEXT[order.status] || []).length ? (
        <form onSubmit={update} className="flex flex-wrap gap-2">
          <select className="field max-w-[220px]" value={status} onChange={(event) => setStatus(event.target.value)}>{NEXT[order.status].map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}</select>
          <input className="field max-w-xs" placeholder={t('admin.note')} value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit">{t('admin.updateStatus')}</Button>
        </form>
      ) : null}
    </div>
  );
}

export function CustomersAdminPage() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  function load() { adminApi.customers({ limit: 40 }).then((res) => setRows(res.data)); }
  useEffect(load, []);
  return (
    <div>
      <h1 className="font-display text-4xl">{t('admin.customers')}</h1>
      <div className="mt-4 space-y-2">
        {rows.map((customer) => (
          <div key={customer._id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm">
            <button type="button" className="text-left" onClick={() => adminApi.customer(customer._id).then((res) => setDetail(res.data))}><span className="font-medium">{customer.name}</span><span className="block text-xs text-ocean-900/50">{customer.phone} · {customer.orderCount} orders · {money(customer.spent)}</span></button>
            <Button variant="outline" size="sm" onClick={async () => { await adminApi.customerStatus(customer._id, !customer.isActive); load(); }}>{customer.isActive ? t('admin.deactivate') : t('admin.activate')}</Button>
          </div>
        ))}
      </div>
      <Modal open={Boolean(detail)} onOpenChange={() => setDetail(null)} title={detail?.user?.name || ''}>
        {detail?.orders?.map((order) => <p key={order._id} className="text-sm">{order.orderNumber} · {t(`status.${order.status}`)} · {money(order.total)} · {dhaka(order.createdAt, i18n.language)}</p>)}
      </Modal>
    </div>
  );
}

export function PromotionsPage() {
  const { t, i18n } = useTranslation();
  const [banners, setBanners] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [banner, setBanner] = useState({ placement: 'hero', title: { en: '', bn: '' }, subtitle: { en: '', bn: '' }, link: '/products', ctaLabel: { en: 'Shop now', bn: 'এখনই কিনুন' }, isActive: true, sortOrder: 0, image: null });
  const [coupon, setCoupon] = useState({ code: '', type: 'percent', value: 10, minOrder: 0, isActive: true, description: { en: '', bn: '' } });
  function load() {
    adminApi.banners().then((res) => setBanners(res.data));
    adminApi.coupons().then((res) => setCoupons(res.data));
  }
  useEffect(load, []);
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const res = await adminApi.upload(file);
    setBanner({ ...banner, image: res.data });
  }
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">{t('admin.promotions')}</h1>
      <section>
        <h2 className="font-display text-2xl">{t('admin.banners')}</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); await adminApi.saveBanner(banner); setBanner({ ...banner, title: { en: '', bn: '' } }); load(); }}>
          <input className="field" placeholder={t('admin.nameEn')} required value={banner.title.en} onChange={(event) => setBanner({ ...banner, title: { ...banner.title, en: event.target.value } })} />
          <input className="field" placeholder={t('admin.nameBn')} value={banner.title.bn} onChange={(event) => setBanner({ ...banner, title: { ...banner.title, bn: event.target.value } })} />
          <input className="field" placeholder="Link" value={banner.link} onChange={(event) => setBanner({ ...banner, link: event.target.value })} />
          <select className="field" value={banner.placement} onChange={(event) => setBanner({ ...banner, placement: event.target.value })}><option value="hero">hero</option><option value="promo">promo</option></select>
          <input type="file" accept="image/*" onChange={upload} />
          <Button type="submit">{t('common.save')}</Button>
        </form>
        <div className="mt-3 space-y-2">{banners.map((item) => <div key={item._id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm"><span>{item.placement} · {lx(item.title, i18n.language)}</span><button type="button" className="text-red-700" onClick={async () => { await adminApi.deleteBanner(item._id); load(); }}>{t('common.delete')}</button></div>)}</div>
      </section>
      <section>
        <h2 className="font-display text-2xl">{t('admin.coupons')}</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={async (event) => { event.preventDefault(); await adminApi.saveCoupon({ ...coupon, value: Number(coupon.value), minOrder: Number(coupon.minOrder) }); load(); }}>
          <input className="field" placeholder={t('admin.code')} required value={coupon.code} onChange={(event) => setCoupon({ ...coupon, code: event.target.value })} />
          <select className="field" value={coupon.type} onChange={(event) => setCoupon({ ...coupon, type: event.target.value })}><option value="percent">percent</option><option value="fixed">fixed</option></select>
          <input className="field" type="number" value={coupon.value} onChange={(event) => setCoupon({ ...coupon, value: event.target.value })} />
          <Button type="submit">{t('common.save')}</Button>
        </form>
        <div className="mt-3 space-y-2">{coupons.map((item) => <div key={item._id} className="flex justify-between rounded-2xl bg-white px-3 py-2 text-sm"><span>{item.code} · {item.type} {item.value} · {item.usedCount || 0} used</span><button type="button" className="text-red-700" onClick={async () => { await adminApi.deleteCoupon(item._id); load(); }}>{t('common.delete')}</button></div>)}</div>
      </section>
    </div>
  );
}

export function SettingsAdminPage() {
  const { t, i18n } = useTranslation();
  const setBrand = useContext(AdminBrandContext);
  const [settings, setSettings] = useState(null);
  const [providers, setProviders] = useState([]);
  const [zones, setZones] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [zone, setZone] = useState({ district: '', area: '', charge: 60, eta: { en: '', bn: '' }, isActive: true });
  useEffect(() => {
    adminApi.settings().then((res) => setSettings(res.data));
    adminApi.providers().then((res) => setProviders(res.data));
    adminApi.zones().then((res) => setZones(res.data));
    adminApi.inquiries().then((res) => setInquiries(res.data));
  }, []);
  if (!settings) return null;
  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const res = await adminApi.upload(file);
      setSettings((current) => ({ ...current, logo: { ...res.data, alt: current.storeName || 'Farm City' } }));
    } catch (error) { toast.error(apiError(error)); }
  }
  async function save(event) {
    event.preventDefault();
    const { _id, __v, createdAt, updatedAt, key, ...body } = settings;
    if (!body.logo?.url) body.logo = null;
    else body.logo = { url: body.logo.url, publicId: body.logo.publicId || '', alt: body.storeName || 'Farm City' };
    try {
      const res = await adminApi.saveSettings(body);
      setSettings(res.data);
      setBrand({ logo: res.data?.logo?.url ? res.data.logo : null, storeName: res.data?.storeName || 'Farm City' });
      toast.success(t('account.saved'));
    } catch (error) { toast.error(apiError(error)); }
  }
  return (
    <div className="space-y-8">
      <form onSubmit={save} className="max-w-3xl space-y-3">
        <h1 className="font-display text-4xl">{t('admin.settings')}</h1>
        <h2 className="font-display text-2xl">{t('admin.store')}</h2>
        <Field label={t('admin.nameEn')}><input className="field" value={settings.storeName} onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} /></Field>
        <div>
          <p className="text-sm font-medium">{t('admin.logo')}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-4 rounded-2xl bg-white px-4 py-3">
            <img src={logoSrc(settings.logo)} alt={t('admin.logo')} className="h-14 w-auto max-w-[10rem] object-contain" />
            <div className="min-w-0">
              <label className="block text-xs text-ocean-900/70">{t('admin.logoUpload')}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="mt-1 block text-sm" onChange={uploadLogo} />
              </label>
              {settings.logo?.url ? <button type="button" className="mt-2 text-xs underline" onClick={() => setSettings({ ...settings, logo: null })}>{t('admin.logoClear')}</button> : null}
            </div>
          </div>
        </div>
        <Field label={t('checkout.phone')}><input className="field" value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></Field>
        <Field label={t('checkout.email')}><input className="field" value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} /></Field>
        <Field label={t('admin.announcement')}><input className="field" value={settings.announcement?.text?.en || ''} onChange={(event) => setSettings({ ...settings, announcement: { ...settings.announcement, enabled: true, text: { ...settings.announcement.text, en: event.target.value } } })} /></Field>
        <Field label={`${t('admin.announcement')} (বাংলা)`}><input className="field" value={settings.announcement?.text?.bn || ''} onChange={(event) => setSettings({ ...settings, announcement: { ...settings.announcement, text: { ...settings.announcement.text, bn: event.target.value } } })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.announcement?.enabled} onChange={(event) => setSettings({ ...settings, announcement: { ...settings.announcement, enabled: event.target.checked } })} />{t('admin.visible')}</label>
        <h2 className="font-display text-2xl">{t('admin.payments')}</h2>
        {providers.map((provider) => (
          <label key={provider.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
            <span><input type="checkbox" className="mr-2" checked={settings.payments?.[provider.id]?.enabled} onChange={(event) => setSettings({ ...settings, payments: { ...settings.payments, [provider.id]: { enabled: event.target.checked } } })} />{t(`pay.${provider.id}`)}</span>
            <span className={provider.configured ? 'text-kelp-700' : 'text-red-700'}>{provider.configured ? t('admin.configured') : t('admin.missing')}</span>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.charge')}><input className="field" type="number" value={settings.defaultDeliveryCharge} onChange={(event) => setSettings({ ...settings, defaultDeliveryCharge: Number(event.target.value) })} /></Field>
          <Field label="Free delivery over"><input className="field" type="number" value={settings.freeDeliveryThreshold} onChange={(event) => setSettings({ ...settings, freeDeliveryThreshold: Number(event.target.value) })} /></Field>
        </div>
        <Button type="submit">{t('common.save')}</Button>
      </form>
      <section>
        <h2 className="font-display text-2xl">{t('admin.zones')}</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-5" onSubmit={async (event) => { event.preventDefault(); await adminApi.saveZone({ ...zone, charge: Number(zone.charge) }); setZones((await adminApi.zones()).data); }}>
          <input className="field" placeholder={t('cart.district')} required value={zone.district} onChange={(event) => setZone({ ...zone, district: event.target.value })} />
          <input className="field" placeholder={t('cart.area')} value={zone.area} onChange={(event) => setZone({ ...zone, area: event.target.value })} />
          <input className="field" type="number" value={zone.charge} onChange={(event) => setZone({ ...zone, charge: event.target.value })} />
          <input className="field" placeholder={t('admin.eta')} value={zone.eta.en} onChange={(event) => setZone({ ...zone, eta: { ...zone.eta, en: event.target.value } })} />
          <Button type="submit">{t('common.save')}</Button>
        </form>
        <div className="mt-3 max-h-80 overflow-auto rounded-2xl bg-white">
          {zones.map((item) => <div key={item._id} className="flex justify-between border-b px-3 py-2 text-sm"><span>{item.district} {item.area} · {money(item.charge)} · {lx(item.eta, i18n.language)}</span><button type="button" className="text-red-700" onClick={async () => { await adminApi.deleteZone(item._id); setZones((await adminApi.zones()).data); }}>{t('common.delete')}</button></div>)}
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl">{t('admin.inquiries')}</h2>
        {inquiries.map((item) => <p key={item._id} className="mt-2 text-sm"><strong>{item.name}</strong> — {item.message}</p>)}
      </section>
    </div>
  );
}

void idOf;
