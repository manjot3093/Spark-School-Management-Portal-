import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Loader 
} from 'lucide-react';
import { Chart } from '../../components/common/Charts';
import Pagination from '../../components/common/Pagination';
import { feesAPI, salaryAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Accounts: React.FC = () => {
  const { state } = useAuth();
  const schoolId = state?.user?.schoolId || localStorage.getItem('schoolId') || '';
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [feeStats, setFeeStats] = useState<any>(null);
  const [salaryStats, setSalaryStats] = useState<any>(null);
  const [feeCollections, setFeeCollections] = useState<any[]>([]);
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const accountPageSize = 5;

  const tabs = [
    { id: 'overview', label: 'Financial Overview', icon: BarChart3 },
    { id: 'income', label: 'Income Management', icon: TrendingUp },
    { id: 'expenses', label: 'Expense Management', icon: TrendingDown }
  ];

  // Fetch financial data
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!schoolId) {
        console.log('No schoolId available, skipping data fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch fee collection stats (income) - filtered by schoolId
        const feeStatsResponse = await feesAPI.getCollectionStats({ schoolId });
        setFeeStats(feeStatsResponse.data);
        
        // Fetch salary stats (expenses) - filtered by schoolId
        const salaryStatsResponse = await salaryAPI.getStats({ schoolId });
        setSalaryStats(salaryStatsResponse.data);
        
        // Fetch all fee collections for income breakdown - filtered by schoolId
        const collectionsResponse = await feesAPI.getCollections({ 
          limit: 1000, 
          status: 'paid',
          schoolId 
        });
        setFeeCollections(collectionsResponse.data || []);
        
        console.log('Fee Stats:', feeStatsResponse.data);
        console.log('Fee Collections:', collectionsResponse.data?.length || 0, 'records');
        console.log('Salary Stats:', salaryStatsResponse.data);
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching financial data:', error);
        toast.error(error.message || 'Failed to load financial data');
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [schoolId]);

  // Calculate financial data from real API data
  const totalIncome = feeStats?.summary?.totalPaid || 0; // Total fees paid by students
  
  // Total expenses = Net salary (actual amount school pays out after deductions)
  const totalExpenses = salaryStats?.current?.totalNetSalary || 0;
  
  const netProfit = totalIncome - totalExpenses;
  const pendingPayments = feeStats?.summary?.totalDue || 0; // Total pending fees

  const financialData = {
    totalIncome,
    totalExpenses,
    netProfit,
    pendingPayments,
  };

  // Income categories from fee collections - group by category
  const incomeCategories = feeCollections.reduce((acc: any[], collection: any) => {
    const categoryName = collection.feeStructure?.category?.name || 'General Fees';
    const existingCategory = acc.find((cat: any) => cat.name === categoryName);
    const amount = Number(collection.paidAmount) || 0;
    
    if (existingCategory) {
      existingCategory.amount += amount;
    } else {
      acc.push({ name: categoryName, amount });
    }
    return acc;
  }, []).map((cat: any) => ({
    ...cat,
    percentage: totalIncome > 0 ? Math.round((cat.amount / totalIncome) * 100) : 0
  }));

  // If we have total income but no category breakdown, create a single category
  const chartIncomeData = incomeCategories.length > 0 
    ? incomeCategories 
    : (totalIncome > 0 ? [{ name: 'Total Fees Collected', amount: totalIncome, percentage: 100 }] : []);

  // Since department stats don't include deductions breakdown, 
  // we'll show total net salary as a single category to match the ₹130 total
  const chartExpenseData = totalExpenses > 0 
    ? [{ name: 'Total Salaries Paid (Net)', amount: totalExpenses, percentage: 100 }] 
    : [];
  
  // For the detailed expense management tab, calculate proportional net amounts
  const expenseCategories = salaryStats?.departmentStats?.map((dept: any) => {
    const grossAmount = dept.totalGrossSalary || 0;
    const totalGross = salaryStats?.current?.totalGrossSalary || 1;
    
    // Calculate this department's proportion of net salary
    const proportionOfTotal = grossAmount / totalGross;
    const netAmount = Math.round(totalExpenses * proportionOfTotal);
    
    return {
      name: dept.designation || 'Other',
      amount: netAmount,
      percentage: totalExpenses > 0 ? Math.round((netAmount / totalExpenses) * 100) : 0
    };
  }) || [];

  const renderFinancialOverview = () => (
    <div className="space-y-3">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200 border-t-4 border-t-[#244d86]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Income</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">₹{financialData.totalIncome.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Fees collected</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200 border-t-4 border-t-[#ef782d]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">₹{financialData.totalExpenses.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Net salary paid</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200 border-t-4 border-t-[#2f7f92]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Net Balance</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">₹{financialData.netProfit.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Income less salary costs</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200 border-t-4 border-t-[#df9c33]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Pending Payments</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">₹{financialData.pendingPayments.toLocaleString()}</p>
              <p className="text-[11px] text-orange-600 mt-0.5">
                {feeStats?.summary?.totalCollections || 0} total fee records
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Fees Collected by Category</h3>
          <div className="h-52">
            {chartIncomeData.length > 0 ? (
              <Chart 
                type="bar" 
                data={{
                  labels: chartIncomeData.map((cat: any) => cat.name).slice(0, 6),
                  datasets: [
                    {
                      label: 'Fees Collected (₹)',
                      data: chartIncomeData.map((cat: any) => cat.amount).slice(0, 6),
                      backgroundColor: 'rgba(34, 197, 94, 0.5)',
                      borderColor: 'rgba(34, 197, 94, 1)',
                      borderWidth: 1
                    }
                  ]
                }} 
                title="Total Fees Collected by Category"
                height={180}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <TrendingUp className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500 text-center">No fee collection data available</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Start collecting fees to see breakdown</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Expense Breakdown</h3>
          <div className="h-52">
            {chartExpenseData.length > 0 ? (
              <Chart 
                type="bar" 
                data={{
                  labels: chartExpenseData.map((dept: any) => dept.name).slice(0, 6),
                  datasets: [
                    {
                      label: 'Net Salaries Paid (₹)',
                      data: chartExpenseData.map((dept: any) => dept.amount).slice(0, 6),
                      backgroundColor: 'rgba(239, 68, 68, 0.5)',
                      borderColor: 'rgba(239, 68, 68, 1)',
                      borderWidth: 1
                    }
                  ]
                }} 
                title="Net Salaries Paid by Department"
                height={180}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <TrendingDown className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500 text-center">No expense data available</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Create salary records to see breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Income vs Expenses Comparison */}
      <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Financial Summary</h3>
        <div className="h-52">
          <Chart 
            type="bar" 
            data={{
              labels: ['Fees collected', 'Salary costs', 'Net balance'],
              datasets: [
                {
                  label: 'Amount (₹)',
                  data: [financialData.totalIncome, financialData.totalExpenses, financialData.netProfit],
                  backgroundColor: [
                    'rgba(34, 197, 94, 0.5)',
                    'rgba(239, 68, 68, 0.5)',
                    'rgba(59, 130, 246, 0.5)'
                  ],
                  borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(59, 130, 246, 1)'
                  ],
                  borderWidth: 1
                }
              ]
            }} 
            title="Overall Financial Status"
            height={180}
          />
        </div>
      </div>
    </div>
  );

  const renderIncomeManagement = () => (
    <div className="space-y-3">
      {/* Total Income Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-xs p-3 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-700">Total Income (Fees Collected)</p>
            <p className="text-2xl font-bold text-green-600 mt-1 leading-tight">₹{totalIncome.toLocaleString()}</p>
            <p className="text-[11px] text-green-600 mt-0.5">
              {feeStats?.summary?.totalCollections || 0} fee collections
            </p>
          </div>
          <div className="p-2.5 bg-green-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Income Categories Breakdown */}
      <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Income by Category</h3>
        {chartIncomeData.length > 0 ? (
          <div className="space-y-2">
            {chartIncomeData
              .slice((incomePage - 1) * accountPageSize, incomePage * accountPageSize)
              .map((category: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-xs text-gray-900 leading-tight">{category.name}</p>
                    <p className="text-[10px] text-gray-500">{category.percentage}% of total income</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-green-600">₹{category.amount.toLocaleString()}</p>
                  <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-0.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(category.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            <Pagination
              compact
              currentPage={incomePage}
              pageSize={accountPageSize}
              totalItems={chartIncomeData.length}
              onPageChange={setIncomePage}
            />
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-gray-900 mb-1">No Income Data</h4>
            <p className="text-[11px] text-gray-500">Start collecting fees to see income breakdown</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderExpenseManagement = () => (
    <div className="space-y-3">
      {/* Total Expenses Summary */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl shadow-xs p-3 border border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-red-700">Total Expenses (Salaries)</p>
            <p className="text-2xl font-bold text-red-600 mt-1 leading-tight">₹{totalExpenses.toLocaleString()}</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              {salaryStats?.current?.totalEmployees || 0} employees
            </p>
          </div>
          <div className="p-2.5 bg-red-100 rounded-lg">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Expense Categories Breakdown */}
      <div className="bg-white rounded-xl shadow-xs p-3 border border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Expenses by Department</h3>
        {expenseCategories.length > 0 ? (
          <div className="space-y-2">
            {expenseCategories
              .slice((expensePage - 1) * accountPageSize, expensePage * accountPageSize)
              .map((category: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-xs text-gray-900 leading-tight">{category.name}</p>
                    <p className="text-[10px] text-gray-500">{category.percentage}% of total expenses</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-red-600">₹{category.amount.toLocaleString()}</p>
                  <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-0.5">
                    <div 
                      className="bg-red-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(category.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            <Pagination
              compact
              currentPage={expensePage}
              pageSize={accountPageSize}
              totalItems={expenseCategories.length}
              onPageChange={setExpensePage}
            />
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingDown className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h4 className="text-xs font-medium text-gray-900 mb-1">No Expense Data</h4>
            <p className="text-[11px] text-gray-500">Create salary records to see expense breakdown</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader className="h-6 w-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-xs text-gray-600">Loading financial data...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderFinancialOverview();
      case 'income':
        return renderIncomeManagement();
      case 'expenses':
        return renderExpenseManagement();
      default:
        return renderFinancialOverview();
    }
  };

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-slate-50/50">
          <nav className="flex gap-1.5 px-3 py-1.5 overflow-x-auto" aria-label="Account sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`py-1.5 px-3 rounded-lg font-semibold text-xs whitespace-nowrap flex items-center space-x-1.5 transition ${
                    activeTab === tab.id
                      ? 'bg-[#213d75] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#213d75] hover:bg-orange-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-3 md:p-4">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Accounts;
