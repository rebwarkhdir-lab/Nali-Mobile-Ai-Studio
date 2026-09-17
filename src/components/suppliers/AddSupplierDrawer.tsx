import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Save, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Tag, 
  ShieldCheck, 
  Star, 
  FileText, 
  Plus, 
  Trash2, 
  Check, 
  Globe, 
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { Supplier, SupplierCompanyType, SupplierStatus } from '../../types/supplier';
import { sound } from '../../lib/sound';
import { formatNumberWithCommas, parseFormattedNumber, cn } from '../../lib/utils';

interface AddSupplierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Supplier | null;
  onSave: (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
}

export default function AddSupplierDrawer({
  isOpen,
  onClose,
  initialData,
  onSave
}: AddSupplierDrawerProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const isEditMode = !!initialData;

  const COMPANY_TYPES: Array<{ value: SupplierCompanyType; label: string }> = [
    { value: 'distributor', label: t('suppliers.companyTypes.distributor') },
    { value: 'wholesaler', label: t('suppliers.companyTypes.wholesaler') },
    { value: 'importer', label: t('suppliers.companyTypes.importer') },
    { value: 'factory_direct', label: t('suppliers.companyTypes.factory_direct') },
    { value: 'trade_in_partner', label: t('suppliers.companyTypes.trade_in_partner') },
    { value: 'service_center', label: t('suppliers.companyTypes.service_center') }
  ];

  const PRESET_CATEGORIES = [
    'Apple iPhones',
    'Samsung Devices',
    'Xiaomi / Poco',
    'iPads & Tablets',
    'Used / Trade-in Phones',
    'Chargers & Fast Adapters',
    'Cables & Hubs',
    'Power Banks',
    'Wireless Audio & Earbuds',
    'Screen Protectors & Glass',
    'Protective Cases & MagSafe',
    'Smartwatch Accessories',
    'Spare Parts & LCD Screens',
    'Repair Tools & Equipment'
  ];

  const PRESET_TERMS = [
    'Cash on Delivery',
    'Net 7 Days',
    'Net 15 Days',
    'Net 30 Days',
    'Weekly Settlement',
    'Monthly Ledger',
    '50% Advance / 50% Delivery',
    'Consignment Basis'
  ];

  const [name, setName] = useState('');
  const [companyType, setCompanyType] = useState<SupplierCompanyType>('distributor');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Erbil');
  const [country, setCountry] = useState('Iraq (Kurdistan)');
  const [taxNumber, setTaxNumber] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 15 Days');
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD');
  const [openingBalanceUSD, setOpeningBalanceUSD] = useState('');
  const [openingBalanceIQD, setOpeningBalanceIQD] = useState('');
  const [creditLimitUSD, setCreditLimitUSD] = useState('');
  const [creditLimitIQD, setCreditLimitIQD] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [status, setStatus] = useState<SupplierStatus>('active');
  const [notes, setNotes] = useState('');

  // Populate on open
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCompanyType(initialData.companyType || 'distributor');
      setContactPerson(initialData.contactPerson || '');
      setPhone(initialData.phone || '');
      setSecondaryPhone(initialData.secondaryPhone || '');
      setEmail(initialData.email || '');
      setWhatsapp(initialData.whatsapp || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || 'Erbil');
      setCountry(initialData.country || 'Iraq (Kurdistan)');
      setTaxNumber(initialData.taxNumber || '');
      setSelectedCategories(initialData.categoriesSupplied || []);
      setPaymentTerms(initialData.paymentTerms || 'Net 15 Days');
      setCurrency(initialData.currency || 'USD');
      setOpeningBalanceUSD(initialData.openingBalanceUSD ? String(initialData.openingBalanceUSD) : '');
      setOpeningBalanceIQD(initialData.openingBalanceIQD ? String(initialData.openingBalanceIQD) : '');
      setCreditLimitUSD(initialData.creditLimitUSD ? String(initialData.creditLimitUSD) : '');
      setCreditLimitIQD(initialData.creditLimitIQD ? String(initialData.creditLimitIQD) : '');
      setRating(initialData.rating || 5);
      setStatus(initialData.status || 'active');
      setNotes(initialData.notes || '');
    } else {
      // Default reset
      setName('');
      setCompanyType('distributor');
      setContactPerson('');
      setPhone('');
      setSecondaryPhone('');
      setEmail('');
      setWhatsapp('');
      setAddress('');
      setCity('Erbil');
      setCountry('Iraq (Kurdistan)');
      setTaxNumber('');
      setSelectedCategories(['Apple iPhones', 'Chargers & Fast Adapters']);
      setPaymentTerms('Net 15 Days');
      setCurrency('USD');
      setOpeningBalanceUSD('');
      setOpeningBalanceIQD('');
      setCreditLimitUSD('10000');
      setCreditLimitIQD('');
      setRating(5);
      setStatus('active');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    sound.playClick();
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCategoryInput.trim() && !selectedCategories.includes(customCategoryInput.trim())) {
      sound.playClick();
      setSelectedCategories([...selectedCategories, customCategoryInput.trim()]);
      setCustomCategoryInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      sound.playError();
      return;
    }

    sound.playSuccess();
    onSave({
      id: initialData?.id,
      name: name.trim(),
      companyType,
      contactPerson: contactPerson.trim() || name.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      city: city.trim(),
      country: country.trim(),
      taxNumber: taxNumber.trim(),
      categoriesSupplied: selectedCategories,
      paymentTerms,
      currency,
      openingBalanceUSD: parseFormattedNumber(openingBalanceUSD) || 0,
      openingBalanceIQD: parseFormattedNumber(openingBalanceIQD) || 0,
      totalPurchasesUSD: initialData?.totalPurchasesUSD || 0,
      totalPurchasesIQD: initialData?.totalPurchasesIQD || 0,
      totalPaidUSD: initialData?.totalPaidUSD || 0,
      totalPaidIQD: initialData?.totalPaidIQD || 0,
      currentDebtUSD: initialData?.currentDebtUSD ?? (parseFormattedNumber(openingBalanceUSD) || 0),
      currentDebtIQD: initialData?.currentDebtIQD ?? (parseFormattedNumber(openingBalanceIQD) || 0),
      creditLimitUSD: creditLimitUSD ? parseFormattedNumber(creditLimitUSD) : undefined,
      creditLimitIQD: creditLimitIQD ? parseFormattedNumber(creditLimitIQD) : undefined,
      rating,
      status,
      notes: notes.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className={cn("fixed inset-y-0 max-w-full flex", isKu ? "left-0 pr-10" : "right-0 pl-10")}>
        <div 
          dir={isKu ? 'rtl' : 'ltr'} 
          className="w-screen max-w-2xl bg-[#0f1422] border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 bg-[#0b0f1a] flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {isEditMode ? t('suppliers.drawer.titleEdit') : t('suppliers.drawer.titleAdd')}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('suppliers.drawer.subtitle')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Core Company Profile */}
            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-indigo-300">
                <Building2 className="w-4 h-4" />
                <span>{t('suppliers.drawer.companyInfo')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.companyName')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('suppliers.drawer.companyNamePlaceholder')}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.classification')}
                  </label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value as SupplierCompanyType)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {COMPANY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.taxNumber')}
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder={t('suppliers.drawer.taxPlaceholder')}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact Person & Communication */}
            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-cyan-300">
                <User className="w-4 h-4" />
                <span>{t('suppliers.drawer.repInfo')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.contactPerson')}
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder={t('suppliers.drawer.contactPlaceholder')}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.phone')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +964 750 123 4567"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.whatsapp')}
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="e.g. +964 750 123 4567"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sales@apple-distrib.iq"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.city')}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Erbil, Baghdad, Sulaymaniyah, Dubai"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.country')}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Iraq (Kurdistan), UAE, China"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.address')}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Empire World Business Tower C, 8th Floor"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Categories & Supplied Brands */}
            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-emerald-300">
                <Layers className="w-4 h-4" />
                <span>{t('suppliers.drawer.categories')}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_CATEGORIES.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer",
                        isSelected
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold"
                          : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add custom category */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder={t('suppliers.drawer.addCategory')}
                  className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  <span>{t('suppliers.buttons.addCompany', { defaultValue: 'Add' })}</span>
                </button>
              </div>
            </div>

            {/* Section 4: Payment Terms & Debt Limits */}
            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-amber-300">
                <DollarSign className="w-4 h-4" />
                <span>{t('suppliers.drawer.financialTerms')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.paymentTerms')}
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {PRESET_TERMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.primaryCurrency')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { sound.playClick(); setCurrency('USD'); }}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        currency === 'USD'
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => { sound.playClick(); setCurrency('IQD'); }}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        currency === 'IQD'
                          ? "bg-amber-600/20 border-amber-500 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      IQD (د.ع)
                    </button>
                  </div>
                </div>

                {!isEditMode && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('suppliers.drawer.openingBalanceUsd')}
                      </label>
                      <input
                        type="text"
                        value={openingBalanceUSD}
                        onChange={(e) => setOpeningBalanceUSD(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('suppliers.drawer.openingBalanceIqd')}
                      </label>
                      <input
                        type="text"
                        value={openingBalanceIQD}
                        onChange={(e) => setOpeningBalanceIQD(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.creditLimitUsd')}
                  </label>
                  <input
                    type="text"
                    value={creditLimitUSD}
                    onChange={(e) => setCreditLimitUSD(e.target.value)}
                    placeholder="e.g. 15,000"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.rating')}
                  </label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => { sound.playClick(); setRating(star); }}
                        className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                      >
                        <Star className={cn("w-6 h-6", star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-600")} />
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 font-medium ml-2 font-mono">
                      {t('suppliers.drawer.stars', { count: rating })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Status & Notes */}
            <div className="bg-[#141b2d] border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.accountStatus')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SupplierStatus)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">{t('suppliers.drawer.active')}</option>
                    <option value="inactive">{t('suppliers.drawer.inactive')}</option>
                    <option value="blocked">{t('suppliers.drawer.blocked')}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('suppliers.drawer.notes')}
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('suppliers.drawer.notesPlaceholder')}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
            >
              {t('suppliers.drawer.cancel')}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
            >
              <Save className="w-4 h-4" />
              <span>{isEditMode ? t('suppliers.drawer.saveUpdate') : t('suppliers.drawer.saveNew')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
