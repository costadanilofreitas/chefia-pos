import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useConfirmDialog } from '../components/ConfirmDialog';
import Toast, { useToast } from '../components/Toast';
import { useBills } from '../hooks/useBills';
import { useEmployee } from '../hooks/useEmployee';
import { useReport } from '../hooks/useReport';
import { useStock } from '../hooks/useStock';
import { useSupplier } from '../hooks/useSupplier';
import type { EmployeeCreate, EmployeeRole, EmploymentType } from '../services/EmployeeService';
import '../index.css';
import { formatCurrency } from '../utils/formatters';

type TabType = 'dashboard' | 'employees' | 'suppliers' | 'stock' | 'bills' | 'reports';

interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
  phone?: string;
  salary?: number;
  is_active?: boolean;
}

interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
}

interface Stock {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  min_quantity?: number;
  unit?: string;
  price?: number;
}

interface Bill {
  id: string;
  description: string;
  supplier?: string;
  amount: number;
  due_date?: string;
  status?: string;
  category?: string;
  notes?: string;
}

export default function ManagerPage() {
  // const _navigate = useNavigate(); // TODO: usar para navegação
  const { toasts, removeToast, success, warning, error } = useToast();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  
  // Hooks
  const { employees, createEmployee, updateEmployee, deleteEmployee, loadEmployees } = useEmployee();
  const { suppliers, createSupplier, updateSupplier, deleteSupplier, loadSuppliers } = useSupplier();
  const { stocks, updateStock, loadStocks } = useStock();
  const { generateReport } = useReport();
  const { 
    bills, 
    // loading: loadingBills, // TODO: usar para indicador de carregamento
    summary: billsSummary,
    // loadBills, // TODO: usar quando implementar carregamento de contas 
    createBill, 
    updateBill, 
    deleteBill, 
    payBill,
    getStatistics 
  } = useBills();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [billsFilter, setBillsFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [employeeModalTab, setEmployeeModalTab] = useState(0);
  
  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: 'cashier',
    operator_id: '',
    password: '',
    phone: '',
    email: '',
    // Informações financeiras
    salary: 0,
    payment_day: 5,
    contract_type: 'clt', // clt, pj, mei, estagio
    admission_date: '',
    // Dados bancários
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    bank_account_type: 'checking', // checking, savings
    pix_key: '',
    // Documentos
    cpf: '',
    rg: '',
    work_card: '', // carteira de trabalho
    // Benefícios
    meal_voucher: 0,
    transport_voucher: 0,
    health_insurance: false,
    other_benefits: 0
  });
  
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    address: '',
    contact_person: ''
  });

  const [billForm, setBillForm] = useState({
    description: '',
    supplier: '',
    amount: 0,
    due_date: '',
    category: '',
    notes: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');

  // Load data on mount
  useEffect(() => {
    loadEmployees().catch(() => error('Erro ao carregar funcionários'));
    loadSuppliers().catch(() => error('Erro ao carregar fornecedores'));
    loadStocks().catch(() => error('Erro ao carregar estoque'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load only once on mount

  // Dashboard stats
  const billsStats = getStatistics();
  const dashboardStats = {
    totalEmployees: employees?.length || 0,
    activeEmployees: employees?.filter((e: Employee) => e.is_active).length || 0,
    totalSuppliers: suppliers?.length || 0,
    lowStockItems: stocks?.filter((s) => s.quantity <= (s.min_quantity || 0)).length || 0,
    pendingBills: billsStats.pendingCount,
    overdueBills: billsStats.overdueCount,
    totalPending: billsStats.totalPending,
    totalOverdue: billsStats.totalOverdue
  };

  // Handle Employee CRUD
  const handleSaveEmployee = async () => {
    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, {
          name: employeeForm.name,
          phone: employeeForm.phone,
          email: employeeForm.email
        });
        success('Funcionário atualizado com sucesso!');
      } else {
        // For creation, map to required fields
        const newEmployee: EmployeeCreate = {
          name: employeeForm.name,
          role: employeeForm.role as EmployeeRole,
          document: employeeForm.operator_id || '00000000000',
          email: employeeForm.email,
          phone: employeeForm.phone,
          employment_type: employeeForm.contract_type as EmploymentType,
          hire_date: employeeForm.admission_date,
          salary: employeeForm.salary,
          password: '123456' // Default password
        };
        await createEmployee(newEmployee);
        success('Funcionário criado com sucesso!');
      }
      setShowEmployeeModal(false);
      resetEmployeeForm();
      loadEmployees();
    } catch {
      error('Erro ao salvar funcionário');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    showConfirm(
      'Excluir Funcionário',
      'Tem certeza que deseja excluir este funcionário?',
      async () => {
        try {
          await deleteEmployee(id);
          success('Funcionário excluído com sucesso!');
          loadEmployees();
        } catch {
          error('Erro ao excluir funcionário');
        }
      },
      { type: 'warning' }
    );
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: '',
      role: 'cashier',
      operator_id: '',
      password: '',
      phone: '',
      email: '',
      salary: 0,
      payment_day: 5,
      contract_type: 'clt',
      admission_date: '',
      bank_name: '',
      bank_agency: '',
      bank_account: '',
      bank_account_type: 'checking',
      pix_key: '',
      cpf: '',
      rg: '',
      work_card: '',
      meal_voucher: 0,
      transport_voucher: 0,
      health_insurance: false,
      other_benefits: 0
    });
    setSelectedEmployee(null);
  };

  // Handle Supplier CRUD
  const handleSaveSupplier = async () => {
    try {
      if (selectedSupplier) {
        await updateSupplier(selectedSupplier.id, supplierForm);
        success('Fornecedor atualizado com sucesso!');
      } else {
        await createSupplier(supplierForm);
        success('Fornecedor criado com sucesso!');
      }
      setShowSupplierModal(false);
      resetSupplierForm();
      loadSuppliers();
    } catch {
      error('Erro ao salvar fornecedor');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    showConfirm(
      'Excluir Fornecedor',
      'Tem certeza que deseja excluir este fornecedor?',
      async () => {
        try {
          await deleteSupplier(id);
          success('Fornecedor excluído com sucesso!');
          loadSuppliers();
        } catch {
          error('Erro ao excluir fornecedor');
        }
      },
      { type: 'warning' }
    );
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      cnpj: '',
      phone: '',
      email: '',
      address: '',
      contact_person: ''
    });
    setSelectedSupplier(null);
  };

  // Handle Bills CRUD
  const handleSaveBill = async () => {
    try {
      if (selectedBill) {
        await updateBill(selectedBill.id, {
          description: billForm.description,
          supplier: billForm.supplier,
          amount: billForm.amount,
          due_date: billForm.due_date,
          category: billForm.category,
          notes: billForm.notes
        });
        success('Conta atualizada com sucesso!');
      } else {
        await createBill(billForm);
        success('Conta criada com sucesso!');
      }
      setShowBillModal(false);
      resetBillForm();
    } catch {
      error('Erro ao salvar conta');
    }
  };

  const handleDeleteBill = async (id: string) => {
    showConfirm(
      'Excluir Conta',
      'Tem certeza que deseja excluir esta conta?',
      async () => {
        try {
          await deleteBill(id);
          success('Conta excluída com sucesso!');
        } catch {
          error('Erro ao excluir conta');
        }
      },
      { type: 'warning' }
    );
  };

  const handlePayBill = async () => {
    if (!selectedBill) return;
    
    try {
      await payBill(selectedBill.id, paymentMethod);
      success('Conta paga com sucesso!');
      setShowPaymentModal(false);
      setSelectedBill(null);
      setPaymentMethod('Dinheiro');
    } catch {
      error('Erro ao pagar conta');
    }
  };

  const resetBillForm = () => {
    setBillForm({
      description: '',
      supplier: '',
      amount: 0,
      due_date: '',
      category: '',
      notes: ''
    });
    setSelectedBill(null);
  };

  const openBillModal = (bill?: Bill) => {
    if (bill) {
      setSelectedBill(bill);
      setBillForm({
        description: bill.description,
        supplier: bill.supplier,
        amount: bill.amount,
        due_date: bill.due_date.split('T')[0],
        category: bill.category,
        notes: bill.notes || ''
      });
    } else {
      resetBillForm();
    }
    setShowBillModal(true);
  };

  // Generate monthly payroll
  const generatePayroll = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const paymentDay = 5; // Default payment day
      
      // Calculate due date for this month's payroll
      const dueDate = new Date(year, currentDate.getMonth(), paymentDay);
      if (dueDate < currentDate) {
        // If payment day has passed, set for next month
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      
      // Get all employees with salary information
      const employeesWithSalary = employees?.filter((emp) => ((emp as Employee).salary || 0) > 0) || [];
      
      if (employeesWithSalary.length === 0) {
        warning('Nenhum funcionário com salário cadastrado');
        return;
      }
      
      // Calculate total payroll
      let totalPayroll = 0;
      const payrollDetails: string[] = [];
      
      employeesWithSalary.forEach((emp) => {
        const totalCost = (emp.salary || 0);
        totalPayroll += totalCost;
        payrollDetails.push(`${emp.name}: ${formatCurrency(totalCost)}`);
      });
      
      // Create payroll bill
      const payrollBill = {
        description: `Folha de Pagamento - ${month.toString().padStart(2, '0')}/${year}`,
        supplier: 'Folha de Pagamento',
        amount: totalPayroll,
        due_date: dueDate.toISOString().split('T')[0],
        category: 'Folha de Pagamento',
        notes: `Detalhes:\n${payrollDetails.join('\n')}\n\nTotal de funcionários: ${employeesWithSalary.length}`
      };
      
      await createBill(payrollBill);
      success(`Folha de pagamento gerada: ${formatCurrency(totalPayroll)}`);
      
      // Also create individual bills for each employee if needed
      showConfirm(
        'Criar Contas Individuais',
        'Deseja criar contas individuais para cada funcionário?',
        async () => {
          for (const emp of employeesWithSalary) {
            const empDueDate = new Date(year, currentDate.getMonth(), paymentDay);
            if (empDueDate < currentDate) {
              empDueDate.setMonth(empDueDate.getMonth() + 1);
            }
            
            const totalCost = (emp.salary || 0);
          
            await createBill({
              description: `Salário - ${emp.name}`,
              supplier: emp.name,
              amount: totalCost,
              due_date: empDueDate.toISOString().split('T')[0],
              category: 'Salários',
              notes: `Salário: ${formatCurrency(emp.salary || 0)}`
            });
          }
          success(`${employeesWithSalary.length} contas individuais criadas`);
        },
        { type: 'info' }
      );
    } catch {
      error('Erro ao gerar folha de pagamento');
    }
  };

  // Handle Stock Update
  const handleUpdateStock = async (item: Stock, newQuantity: number) => {
    try {
      await updateStock(item.id, { quantity: newQuantity });
      success('Estoque atualizado com sucesso!');
      loadStocks();
    } catch {
      error('Erro ao atualizar estoque');
    }
  };

  // Filter data based on search
  const filteredEmployees = (employees as Employee[])?.filter((e: Employee) => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredSuppliers = (suppliers as Supplier[])?.filter((s: Supplier) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cnpj?.includes(searchTerm)
  ) || [];

  const filteredStock = (stocks as Stock[])?.filter((s: Stock) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredBills = (bills as Bill[])?.filter((b: Bill) => {
    const matchesSearch = b.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const now = new Date();
    const matchesFilter = billsFilter === 'all' ||
                         (billsFilter === 'pending' && b.status === 'pending') ||
                         (billsFilter === 'overdue' && b.status === 'pending' && new Date(b.due_date) < now) ||
                         (billsFilter === 'paid' && b.status === 'paid');
    
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-600 dark:text-gray-400">
            Painel de controle gerencial completo
          </p>
          
          {/* Search */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-4 py-2 pl-10 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {[
            { key: 'dashboard' as TabType, label: 'Dashboard', icon: '📊' },
            { key: 'employees' as TabType, label: 'Funcionários', icon: '👥' },
            { key: 'suppliers' as TabType, label: 'Fornecedores', icon: '🚚' },
            { key: 'stock' as TabType, label: 'Estoque', icon: '📦' },
            { key: 'bills' as TabType, label: 'Contas a Pagar', icon: '💳' },
            { key: 'reports' as TabType, label: 'Relatórios', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={`Ver ${tab.label}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Funcionários</span>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {dashboardStats.totalEmployees}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {dashboardStats.activeEmployees} ativos
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Fornecedores</span>
                <span className="text-2xl">🚚</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {dashboardStats.totalSuppliers}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Estoque Baixo</span>
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {dashboardStats.lowStockItems}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                itens críticos
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Contas Vencidas</span>
                <span className="text-2xl">🚨</span>
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {dashboardStats.overdueBills}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatCurrency(dashboardStats.totalOverdue)}
              </p>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Gerenciar Funcionários
              </h2>
              <button
                onClick={() => {
                  resetEmployeeForm();
                  setShowEmployeeModal(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                title="Adicionar novo funcionário"
              >
                <span>➕</span> Novo Funcionário
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID Operador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Salário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{employee.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{employee.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.role === 'manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                          employee.role === 'cashier' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(employee.salary || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{employee.phone}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            // Convert Employee to form format
                            setEmployeeForm({
                              ...employeeForm,
                              name: employee.name,
                              email: employee.email,
                              phone: employee.phone || '',
                              salary: employee.salary || 0,
                              role: employee.role as string
                            });
                            setShowEmployeeModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mr-3"
                          title="Editar funcionário"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                          title="Excluir funcionário"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Gerenciar Fornecedores
              </h2>
              <button
                onClick={() => {
                  resetSupplierForm();
                  setShowSupplierModal(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                title="Adicionar novo fornecedor"
              >
                <span>➕</span> Novo Fornecedor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{supplier.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setSupplierForm({
                            name: supplier.name,
                            cnpj: supplier.cnpj,
                            phone: supplier.phone,
                            email: supplier.email,
                            address: supplier.address || '',
                            contact_person: supplier.contact_person || ''
                          });
                          setShowSupplierModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        title="Editar fornecedor"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                        title="Excluir fornecedor"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">CNPJ: {supplier.cnpj}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">📱 {supplier.phone}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">✉️ {supplier.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Contato: {supplier.contact_person}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Controle de Estoque
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantidade</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mínimo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStock.map((item: Stock) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateStock(item, parseInt(e.target.value))}
                          className="w-20 px-2 py-1 text-center bg-gray-100 dark:bg-gray-700 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                        {item.min_quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {item.quantity <= item.min_quantity ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full text-xs">
                            Baixo
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-xs">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleUpdateStock(item, item.quantity)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          title="Atualizar estoque"
                        >
                          💾
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Contas a Pagar
              </h2>
              <div className="flex items-center gap-3">
                {/* Filter Buttons */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['all', 'pending', 'overdue', 'paid'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setBillsFilter(filter)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        billsFilter === filter
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {filter === 'all' && 'Todas'}
                      {filter === 'pending' && 'Pendentes'}
                      {filter === 'overdue' && 'Vencidas'}
                      {filter === 'paid' && 'Pagas'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={generatePayroll}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  title="Gerar folha de pagamento"
                >
                  <span>💰</span> Gerar Folha
                </button>
                <button
                  onClick={() => openBillModal()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  title="Adicionar nova conta"
                >
                  <span>➕</span> Nova Conta
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Pendente</span>
                  <span className="text-yellow-500">⏳</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dashboardStats.totalPending)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {dashboardStats.pendingBills} contas
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Vencidas</span>
                  <span className="text-red-500">🚨</span>
                </div>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(dashboardStats.totalOverdue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {dashboardStats.overdueBills} contas
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pagas este Mês</span>
                  <span className="text-green-500">✅</span>
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(billsSummary?.total_paid_this_month || 0)}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Próximo Vencimento</span>
                  <span className="text-blue-500">📅</span>
                </div>
                {billsSummary?.next_due ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {billsSummary.next_due.supplier}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(billsSummary.next_due.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Nenhuma conta pendente
                  </p>
                )}
              </div>
            </div>

            {/* Bills List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fornecedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoria</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBills.map((bill) => {
                    const dueDate = new Date(bill.due_date);
                    const isOverdue = bill.status === 'pending' && dueDate < new Date();
                    
                    return (
                      <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {bill.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {bill.supplier}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {bill.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(bill.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                            {dueDate.toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {bill.status === 'paid' && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-xs">
                              Paga
                            </span>
                          )}
                          {bill.status === 'pending' && !isOverdue && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded-full text-xs">
                              Pendente
                            </span>
                          )}
                          {isOverdue && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full text-xs">
                              Vencida
                            </span>
                          )}
                          {bill.status === 'cancelled' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-full text-xs">
                              Cancelada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex justify-center gap-2">
                            {bill.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setShowPaymentModal(true);
                                }}
                                className="text-green-600 hover:text-green-800 dark:text-green-400"
                                title="Pagar conta"
                              >
                                💰
                              </button>
                            )}
                            <button
                              onClick={() => openBillModal(bill)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              title="Editar conta"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                              title="Excluir conta"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredBills.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Nenhuma conta encontrada
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: 'sales', title: 'Relatório de Vendas', icon: '💰', color: 'green' },
              { type: 'inventory', title: 'Relatório de Estoque', icon: '📦', color: 'blue' },
              { type: 'employees', title: 'Relatório de Funcionários', icon: '👥', color: 'purple' },
              { type: 'suppliers', title: 'Relatório de Fornecedores', icon: '🚚', color: 'orange' },
              { type: 'financial', title: 'Relatório Financeiro', icon: '📊', color: 'red' },
              { type: 'products', title: 'Relatório de Produtos', icon: '🛍️', color: 'indigo' }
            ].map(report => (
              <button
                key={report.type}
                onClick={() => {
                  generateReport(report.type);
                  success(`Gerando ${report.title}...`);
                }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{report.icon}</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{report.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Clique para gerar
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedEmployee ? 'Editar' : 'Novo'} Funcionário
            </h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              {['Dados Pessoais', 'Financeiro', 'Bancário', 'Benefícios'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setEmployeeModalTab(index)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    employeeModalTab === index
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="space-y-4">
              {/* Dados Pessoais Tab */}
              {employeeModalTab === 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="employee-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome Completo
                      </label>
                      <input
                        id="employee-name"
                        type="text"
                        value={employeeForm.name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CPF
                      </label>
                      <input
                        id="employee-cpf"
                        type="text"
                        value={employeeForm.cpf}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-rg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        RG
                      </label>
                      <input
                        id="employee-rg"
                        type="text"
                        value={employeeForm.rg}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, rg: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ID Operador
                      </label>
                      <input
                        type="text"
                        value={employeeForm.operator_id}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, operator_id: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cargo
                      </label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      >
                        <option value="cashier">Caixa</option>
                        <option value="waiter">Garçom</option>
                        <option value="cook">Cozinheiro</option>
                        <option value="manager">Gerente</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="employee-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Telefone
                      </label>
                      <input
                        id="employee-phone"
                        type="tel"
                        value={employeeForm.phone}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        id="employee-email"
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    {!selectedEmployee && (
                      <div>
                        <label htmlFor="employee-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Senha
                        </label>
                        <input
                          id="employee-password"
                          type="password"
                          value={employeeForm.password}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="employee-work-card" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Carteira de Trabalho
                      </label>
                      <input
                        id="employee-work-card"
                        type="text"
                        value={employeeForm.work_card}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, work_card: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  </div>
              )}
              
              {/* Financeiro Tab */}
              {employeeModalTab === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="employee-salary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Salário (R$)
                      </label>
                      <input
                        id="employee-salary"
                        type="number"
                        value={employeeForm.salary}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, salary: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-contract" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Contrato
                      </label>
                      <select
                        id="employee-contract"
                        value={employeeForm.contract_type}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, contract_type: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      >
                        <option value="clt">CLT</option>
                        <option value="pj">PJ</option>
                        <option value="mei">MEI</option>
                        <option value="estagio">Estágio</option>
                        <option value="temporario">Temporário</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="employee-payment-day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dia de Pagamento
                      </label>
                      <input
                        id="employee-payment-day"
                        type="number"
                        min="1"
                        max="31"
                        value={employeeForm.payment_day}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, payment_day: parseInt(e.target.value) || 5 })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-admission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data de Admissão
                      </label>
                      <input
                        id="employee-admission"
                        type="date"
                        value={employeeForm.admission_date}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, admission_date: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 O salário será automaticamente incluído nas contas a pagar no dia {employeeForm.payment_day} de cada mês.
                    </p>
                  </div>
                </>
              )}
              
              {/* Bancário Tab */}
              {employeeModalTab === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="employee-bank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Banco
                      </label>
                      <input
                        id="employee-bank"
                        type="text"
                        value={employeeForm.bank_name}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, bank_name: e.target.value })}
                        placeholder="Ex: Banco do Brasil"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-agency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Agência
                      </label>
                      <input
                        id="employee-agency"
                        type="text"
                        value={employeeForm.bank_agency}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, bank_agency: e.target.value })}
                        placeholder="0000-0"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Conta
                      </label>
                      <input
                        id="employee-account"
                        type="text"
                        value={employeeForm.bank_account}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account: e.target.value })}
                        placeholder="00000-0"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-account-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Conta
                      </label>
                      <select
                        id="employee-account-type"
                        value={employeeForm.bank_account_type}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account_type: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      >
                        <option value="checking">Conta Corrente</option>
                        <option value="savings">Poupança</option>
                        <option value="salary">Conta Salário</option>
                      </select>
                    </div>
                    
                    <div className="col-span-2">
                      <label htmlFor="employee-pix" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Chave PIX
                      </label>
                      <input
                        id="employee-pix"
                        type="text"
                        value={employeeForm.pix_key}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, pix_key: e.target.value })}
                        placeholder="CPF, Email, Telefone ou Chave Aleatória"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Benefícios Tab */}
              {employeeModalTab === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="employee-meal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Vale Refeição (R$/mês)
                      </label>
                      <input
                        id="employee-meal"
                        type="number"
                        value={employeeForm.meal_voucher}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, meal_voucher: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-transport" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Vale Transporte (R$/mês)
                      </label>
                      <input
                        id="employee-transport"
                        type="number"
                        value={employeeForm.transport_voucher}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, transport_voucher: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="employee-benefits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Outros Benefícios (R$/mês)
                      </label>
                      <input
                        id="employee-benefits"
                        type="number"
                        value={employeeForm.other_benefits}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, other_benefits: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="health_insurance"
                        checked={employeeForm.health_insurance}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, health_insurance: e.target.checked })}
                        className="mr-2"
                      />
                      <label htmlFor="health_insurance" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Plano de Saúde
                      </label>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                      Custo Total do Funcionário:
                    </p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                      {formatCurrency(
                        (employeeForm.salary || 0) + 
                        (employeeForm.meal_voucher || 0) + 
                        (employeeForm.transport_voucher || 0) + 
                        (employeeForm.other_benefits || 0)
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  resetEmployeeForm();
                  setEmployeeModalTab(0);
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEmployee}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedSupplier ? 'Editar' : 'Novo'} Fornecedor
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="supplier-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome
                </label>
                <input
                  id="supplier-name"
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="supplier-cnpj" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CNPJ
                </label>
                <input
                  id="supplier-cnpj"
                  type="text"
                  value={supplierForm.cnpj}
                  onChange={(e) => setSupplierForm({ ...supplierForm, cnpj: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="supplier-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone
                </label>
                <input
                  id="supplier-phone"
                  type="tel"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="supplier-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="supplier-email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label htmlFor="supplier-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pessoa de Contato
                </label>
                <input
                  id="supplier-contact"
                  type="text"
                  value={supplierForm.contact_person}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowSupplierModal(false);
                  resetSupplierForm();
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSupplier}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedBill ? 'Editar' : 'Nova'} Conta
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="bill-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <input
                  id="bill-description"
                  type="text"
                  value={billForm.description}
                  onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Ex: Fornecedor de Bebidas"
                />
              </div>
              
              <div>
                <label htmlFor="bill-supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fornecedor
                </label>
                <input
                  id="bill-supplier"
                  type="text"
                  value={billForm.supplier}
                  onChange={(e) => setBillForm({ ...billForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Ex: Distribuidora ABC"
                />
              </div>
              
              <div>
                <label htmlFor="bill-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoria
                </label>
                <select
                  id="bill-category"
                  value={billForm.category}
                  onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="">Selecione uma categoria</option>
                  <option value="Fornecedores">Fornecedores</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Utilidades">Utilidades</option>
                  <option value="Salários">Salários</option>
                  <option value="Impostos">Impostos</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor
                </label>
                <input
                  type="number"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({ ...billForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={billForm.due_date}
                  onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  rows={3}
                  placeholder="Observações opcionais..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowBillModal(false);
                  resetBillForm();
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBill}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Pagar Conta
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Conta</p>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedBill?.description}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fornecedor: {selectedBill?.supplier}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                {formatCurrency(selectedBill?.amount || 0)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Método de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Dinheiro', 'Débito', 'Crédito', 'PIX', 'Boleto', 'Transferência'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      paymentMethod === method
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedBill(null);
                  setPaymentMethod('Dinheiro');
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayBill}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages */}
      <Toast messages={toasts} onRemove={removeToast} />
      
      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
}