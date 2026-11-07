import React, { useState } from 'react';
import { DollarSign, CreditCard, AlertCircle, BarChart3, FileText, Bus, Home, Layers } from 'lucide-react';
import FeeHeads from './FeeHeads';
import FeeStructure from './FeeStructure';
import FeeCollection from './FeeCollection';
import DuesFee from './DuesFee';
import FeeReports from './FeeReports';
import Invoice from './Invoice';
import TransportFees from './TransportFees';
import DormitoryFees from './DormitoryFees';

const Fees: React.FC = () => {
  const [activeTab, setActiveTab] = useState('fee-heads');

  const tabs = [
    { id: 'fee-heads', label: 'Charge Types', icon: Layers },
    { id: 'fee-structure', label: 'Fee Structure', icon: DollarSign },
    { id: 'fee-collection', label: 'Fee Collection', icon: CreditCard },
    { id: 'transport-fees', label: 'Transport Fees', icon: Bus },
    { id: 'dormitory-fees', label: 'Dormitory Fees', icon: Home },
    { id: 'due-fees', label: 'Due Fees', icon: AlertCircle },
    { id: 'fee-reports', label: 'Reports', icon: BarChart3 },
    { id: 'invoice', label: 'Invoice Generation', icon: FileText },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-2.5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 bg-slate-50/50">
            <nav className="flex gap-1 px-3 py-1.5 overflow-x-auto scrollbar-hide" aria-label="Fee sections">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    className={`
                      py-1 px-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'bg-[#213d75] text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-[#213d75] hover:bg-orange-50'
                      }
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        {/* Tab Content */}
        <div className="py-1">
          {activeTab === 'fee-heads' && <FeeHeads />}
          {activeTab === 'fee-structure' && <FeeStructure />}
          {activeTab === 'fee-collection' && <FeeCollection />}
          {activeTab === 'transport-fees' && <TransportFees />}
          {activeTab === 'dormitory-fees' && <DormitoryFees />}
          {activeTab === 'due-fees' && <DuesFee />}
          {activeTab === 'fee-reports' && <FeeReports />}
          {activeTab === 'invoice' && <Invoice />}
        </div>
      </div>
    </div>
  );
};

export default Fees;
