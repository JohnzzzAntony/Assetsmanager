'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assetsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface PrintAcquisitionViewProps {
  id: string
}

export function PrintAcquisitionView({ id }: PrintAcquisitionViewProps) {
  const { back } = useNav()

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.get(id),
    enabled: !!id,
  })

  // Editable Form States
  const [empId, setEmpId] = useState('')
  const [branch, setBranch] = useState('')
  const [branchOther, setBranchOther] = useState('')
  const [purchaseType, setPurchaseType] = useState('')
  const [purchaseTypeOther, setPurchaseTypeOther] = useState('')
  const [osType, setOsType] = useState('')
  const [requestType, setRequestType] = useState('New')
  const [descriptionOfOther, setDescriptionOfOther] = useState('')
  const [justification, setJustification] = useState('')
  const [specialNeeds, setSpecialNeeds] = useState('')
  const [issuedBy, setIssuedBy] = useState('')

  // Prefill logic on load
  useEffect(() => {
    if (!asset) return

    // Location / Branch prefill mapping
    const locName = asset.location?.name || asset.assignedTo?.location?.name || ''
    const branches = [
      'Head Office',
      'Karji Perfumes',
      'Atelier Perfumery',
      'Touch Of Oud',
      'Flower District',
      'First Perfumes',
    ]

    if (locName) {
      const foundBranch = branches.find(
        (b) => b.toLowerCase() === locName.toLowerCase()
      )
      if (foundBranch) {
        setBranch(foundBranch)
      } else {
        setBranch('Other')
        setBranchOther(locName)
      }
    }

    // Purchase Type prefill mapping
    const typeName = asset.assetType?.name || ''
    const types = ['Desktop', 'Printer', 'Laptop', 'Mobile', 'Software']
    if (typeName) {
      // Normalizing printer types
      let mappedType = ''
      if (typeName.toLowerCase().includes('desktop')) mappedType = 'Desktop'
      else if (typeName.toLowerCase().includes('printer')) mappedType = 'Printer'
      else if (typeName.toLowerCase().includes('laptop') || typeName.toLowerCase().includes('notebook')) mappedType = 'Laptop'
      else if (
        typeName.toLowerCase().includes('mobile') ||
        typeName.toLowerCase().includes('phone') ||
        typeName.toLowerCase().includes('tablet')
      )
        mappedType = 'Mobile'
      else if (typeName.toLowerCase().includes('software') || typeName.toLowerCase().includes('license'))
        mappedType = 'Software'

      const matched = types.find((t) => t === mappedType)
      if (matched) {
        setPurchaseType(matched)
      } else {
        setPurchaseType('Other')
        setPurchaseTypeOther(typeName)
      }
    }

    // OS Type prefill mapping
    const osName = asset.os || ''
    if (osName) {
      if (osName.toLowerCase().includes('win')) setOsType('Windows')
      else if (osName.toLowerCase().includes('mac') || osName.toLowerCase().includes('osx')) setOsType('Mac OS')
      else if (osName.toLowerCase().includes('linux') || osName.toLowerCase().includes('ubuntu')) setOsType('Linux')
      else if (osName.toLowerCase().includes('android')) setOsType('Android')
    }

    // Comments/Notes
    if (asset.comments) {
      setSpecialNeeds(asset.comments)
    }
  }, [asset])

  if (isLoading || !asset) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading form details...</div>
      </div>
    )
  }

  // Helper for printable checkbox UI (SVG squares to guarantee print compatibility)
  const Checkbox = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none text-xs md:text-sm print:cursor-default">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={typeof window === 'undefined' ? false : undefined}
      />
      <div className="h-4 w-4 border border-slate-700 flex items-center justify-center rounded-sm bg-white shrink-0 print:border-black print:border-[1.5px]">
        {checked && (
          <svg className="h-3 w-3 text-blue-700 print:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-slate-800 print:text-black font-medium">{label}</span>
    </label>
  )

  const Radio = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none text-xs md:text-sm print:cursor-default">
      <input
        type="radio"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className="h-4 w-4 border border-slate-700 flex items-center justify-center rounded-full bg-white shrink-0 print:border-black print:border-[1.5px]">
        {checked && (
          <div className="h-2 w-2 rounded-full bg-blue-700 print:bg-black" />
        )}
      </div>
      <span className="text-slate-800 print:text-black font-medium">{label}</span>
    </label>
  )

  return (
    <div className="space-y-6">
      {/* CSS overrides for printing */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
            position: relative;
          }
          /* Fix margins for A4 Portrait */
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          input[type="text"], textarea {
            border-bottom: 1px solid black !important;
            background: transparent !important;
            padding-bottom: 2px !important;
          }
        }
      `}</style>

      {/* Control Bar (Hidden on print) */}
      <div className="no-print flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={back}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-muted-foreground">Print Preview</span>
        </div>
        <Button onClick={() => window.print()} className="hover-ripple bg-blue-700 hover:bg-blue-800 text-white">
          <Printer className="h-4 w-4 mr-2" /> Print Form
        </Button>
      </div>

      {/* Main Printable A4 Container */}
      <div className="print-container mx-auto max-w-[800px] border rounded-lg shadow-sm bg-white p-8 md:p-12 relative overflow-hidden font-sans text-slate-900 border-slate-200">
        
        {/* Background Watermark (Rendered as repeating diagonal lines of Maylaa International logo text) */}
        <div className="absolute inset-0 pointer-events-none select-none opacity-[0.03] print:opacity-[0.035] flex flex-col justify-around items-center z-0 rotate-[-25deg] scale-125">
          <div className="text-5xl md:text-7xl font-extrabold text-blue-900 tracking-widest uppercase">maylaa international</div>
          <div className="text-5xl md:text-7xl font-extrabold text-blue-900 tracking-widest uppercase">maylaa international</div>
          <div className="text-5xl md:text-7xl font-extrabold text-blue-900 tracking-widest uppercase">maylaa international</div>
        </div>

        {/* Content Layer */}
        <div className="relative z-10 space-y-6">
          
          {/* Header Section (Logo and Title) */}
          <div className="flex justify-between items-start gap-4 pb-4">
            <div className="flex-1 text-left pt-1">
              <h1 className="text-lg md:text-xl font-bold tracking-wide text-slate-800 print:text-black">
                MAYLAA INTERNATIONAL TRADING L.L.C.
              </h1>
              <h2 className="text-sm md:text-base font-bold tracking-wider text-slate-700 print:text-black mt-1">
                IT PURCHASE REQUEST/ACQUISITION FORM
              </h2>
            </div>
            
            {/* Maylaa International Stylized SVG Logo */}
            <div className="shrink-0">
              <svg className="h-10 md:h-12 w-auto" viewBox="0 0 160 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Stylized M/W Blue geometric lines */}
                <path d="M10 38 L22 12 L34 38 L46 12 L58 38" stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 12 L34 26 L46 12" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Maylaa Text */}
                <text x="68" y="26" fontFamily="'Outfit', 'Inter', sans-serif" fontSize="21" fontWeight="700" fill="#1d4ed8">maylaa</text>
                <text x="68" y="38" fontFamily="'Inter', sans-serif" fontSize="9.5" fontWeight="600" fill="#64748b" letterSpacing="1.5">International</text>
              </svg>
            </div>
          </div>

          {/* Form Top Description Note */}
          <p className="text-[11px] md:text-xs leading-relaxed text-slate-700 print:text-black text-justify border-b border-slate-200 pb-3 border-dashed">
            This form must be completed for all hardware and software purchase/acquisition requests. Send the signed form to the Head Office OR E-mail the form to <a href="mailto:it@maylaainternational.com" className="text-blue-700 underline print:text-black font-semibold">it@maylaainternational.com</a>. All the requests will be processed in the order received.
          </p>

          {/* User Details Fields */}
          <div className="space-y-3.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">
                Name of the person using the hardware/software:
              </span>
              <input
                type="text"
                className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm font-semibold focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                defaultValue={asset.assignedTo?.fullName || ''}
                placeholder="Name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Department:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.assignedTo?.department?.name || asset.department?.name || ''}
                  placeholder="Department"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Emp ID:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black font-mono"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="Emp ID"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Phone No.:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.assignedTo?.phone || ''}
                  placeholder="Phone"
                />
              </div>
            </div>
          </div>

          {/* Branch Checkboxes */}
          <div className="space-y-2.5">
            <span className="text-xs md:text-sm font-bold text-slate-800 print:text-black block">Check one from below:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Checkbox checked={branch === 'Head Office'} label="Head Office" onChange={() => setBranch('Head Office')} />
              <Checkbox checked={branch === 'Karji Perfumes'} label="Karji Perfumes" onChange={() => setBranch('Karji Perfumes')} />
              <Checkbox checked={branch === 'Atelier Perfumery'} label="Atelier Perfumery" onChange={() => setBranch('Atelier Perfumery')} />
              <Checkbox checked={branch === 'Touch Of Oud'} label="Touch Of Oud" onChange={() => setBranch('Touch Of Oud')} />
              <Checkbox checked={branch === 'Flower District'} label="Flower District" onChange={() => setBranch('Flower District')} />
              <Checkbox checked={branch === 'First Perfumes'} label="First Perfumes" onChange={() => setBranch('First Perfumes')} />
              <Checkbox checked={branch === 'Other'} label="Other" onChange={() => setBranch('Other')} />
            </div>
            
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Description of Branch / Other:</span>
              <input
                type="text"
                className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                value={branch === 'Other' ? branchOther : ''}
                onChange={(e) => {
                  setBranch('Other')
                  setBranchOther(e.target.value)
                }}
                placeholder="If Other, specify branch location"
              />
            </div>
          </div>

          {/* Type of Purchase */}
          <div className="space-y-2.5">
            <span className="text-xs md:text-sm font-bold text-slate-800 print:text-black block">Type of Purchase (check one):</span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <Checkbox checked={purchaseType === 'Desktop'} label="Desktop" onChange={() => setPurchaseType('Desktop')} />
              <Checkbox checked={purchaseType === 'Printer'} label="Printer" onChange={() => setPurchaseType('Printer')} />
              <Checkbox checked={purchaseType === 'Laptop'} label="Laptop" onChange={() => setPurchaseType('Laptop')} />
              <Checkbox checked={purchaseType === 'Mobile'} label="Mobile" onChange={() => setPurchaseType('Mobile')} />
              <Checkbox checked={purchaseType === 'Software'} label="Software" onChange={() => setPurchaseType('Software')} />
              <Checkbox checked={purchaseType === 'Other'} label="Other" onChange={() => setPurchaseType('Other')} />
            </div>
          </div>

          {/* Type of OS & Request Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* OS Selection */}
            <div className="space-y-2.5">
              <span className="text-xs md:text-sm font-bold text-slate-800 print:text-black block">Type of OS (check one):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Checkbox checked={osType === 'Windows'} label="Windows" onChange={() => setOsType('Windows')} />
                <Checkbox checked={osType === 'Mac OS'} label="Mac OS" onChange={() => setOsType('Mac OS')} />
                <Checkbox checked={osType === 'Linux'} label="Linux" onChange={() => setOsType('Linux')} />
                <Checkbox checked={osType === 'Android'} label="Android" onChange={() => setOsType('Android')} />
              </div>
            </div>

            {/* Request Type */}
            <div className="space-y-2.5">
              <span className="text-xs md:text-sm font-bold text-slate-800 print:text-black block">Type of request (check one):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Radio checked={requestType === 'New'} label="New" onChange={() => setRequestType('New')} />
                <Radio checked={requestType === 'Renewal'} label="Renewal" onChange={() => setRequestType('Renewal')} />
                <Radio checked={requestType === 'Replacement'} label="Replacement" onChange={() => setRequestType('Replacement')} />
                <Radio checked={requestType === 'Upgrade'} label="Upgrade" onChange={() => setRequestType('Upgrade')} />
              </div>
            </div>
          </div>

          {/* Description of other OS/Purchase/Request */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Description of other:</span>
            <input
              type="text"
              className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
              value={descriptionOfOther}
              onChange={(e) => setDescriptionOfOther(e.target.value)}
              placeholder="e.g. specialized device types, specific renewals details"
            />
          </div>

          {/* Location where hardware will be installed */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Location where the hardware/software will be installed:</span>
            <input
              type="text"
              className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black font-semibold"
              defaultValue={asset.location?.name || ''}
              placeholder="Installation Location"
            />
          </div>

          {/* Special needs or other info */}
          <div className="space-y-1.5">
            <span className="text-xs md:text-sm font-semibold text-slate-800 print:text-black block">Please provide any other information/special needs for the purchase requested:</span>
            <textarea
              rows={2}
              className="w-full border border-slate-300 rounded-md p-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black print:border-t-0 print:border-x-0 print:rounded-none print:px-0 print:py-0.5 print:resize-none"
              value={specialNeeds}
              onChange={(e) => setSpecialNeeds(e.target.value)}
              placeholder="Write any extra details or requirements..."
            />
          </div>

          {/* Justification section */}
          <div className="space-y-1.5">
            <span className="text-xs md:text-sm font-bold text-slate-800 print:text-black block leading-snug">
              Justification <span className="text-[10px] md:text-xs font-normal text-slate-600 print:text-black">(Please include information about how the computer will be used. If you are requesting high-end specifications, be very explicit about the function that requires and justifies the cost):</span>
            </span>
            <textarea
              rows={3}
              className="w-full border border-slate-300 rounded-md p-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black print:border-t-0 print:border-x-0 print:rounded-none print:px-0 print:py-0.5 print:resize-none"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Justify this purchase request..."
            />
          </div>

          {/* Signatures Row */}
          <div className="grid grid-cols-3 gap-6 pt-6 text-xs md:text-sm">
            <div className="space-y-6">
              <div className="border-b border-slate-400 print:border-black h-8 flex items-end">
                {/* Staff Sign line */}
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800 print:text-black block">Staff Signature:</span>
                <div className="flex gap-1.5">
                  <span className="font-semibold text-slate-600 print:text-black shrink-0">Date:</span>
                  <input type="text" className="w-full border-b border-slate-300 print:border-black bg-transparent text-xs focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-400 print:border-black h-8 flex items-end">
                {/* Manager / HR Sign line */}
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800 print:text-black block">Manager / HR Signature:</span>
                <div className="flex gap-1.5">
                  <span className="font-semibold text-slate-600 print:text-black shrink-0">Date:</span>
                  <input type="text" className="w-full border-b border-slate-300 print:border-black bg-transparent text-xs focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-400 print:border-black h-8 flex items-end">
                {/* IT Manager Sign line */}
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800 print:text-black block">IT Manager Signature:</span>
                <div className="flex gap-1.5">
                  <span className="font-semibold text-slate-600 print:text-black shrink-0">Date:</span>
                  <input type="text" className="w-full border-b border-slate-300 print:border-black bg-transparent text-xs focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* IT Department Use Section */}
          <div className="pt-6 border-t border-slate-200 border-dashed">
            
            {/* IT Department Use Divider Line */}
            <div className="relative flex py-2 items-center justify-center">
              <div className="flex-grow border-t border-slate-400 print:border-black border-dashed"></div>
              <span className="flex-shrink mx-4 text-xs md:text-sm font-extrabold uppercase tracking-widest text-slate-800 print:text-black">
                IT Department Use
              </span>
              <div className="flex-grow border-t border-slate-400 print:border-black border-dashed"></div>
            </div>

            {/* IT Dept Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Manufacturer:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm font-medium focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.make || ''}
                  placeholder="Manufacturer / Make"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Model:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm font-medium focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.model || ''}
                  placeholder="Model Name / Number"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">S/n No.:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm font-mono focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.serialNumber || ''}
                  placeholder="Serial Number"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">IMEI No.:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm font-mono focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.imei1 || asset.imei2 || ''}
                  placeholder="IMEI Number"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Date of Purchase:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  defaultValue={asset.purchaseDate ? formatDate(asset.purchaseDate) : ''}
                  placeholder="Purchase Date"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-semibold shrink-0 text-slate-800 print:text-black">Issued By:</span>
                <input
                  type="text"
                  className="flex-1 min-w-0 border-b border-slate-300 px-1 py-0.5 text-xs md:text-sm focus:outline-none focus:border-blue-500 bg-transparent text-slate-900 print:border-black"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  placeholder="IT Staff name"
                />
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
