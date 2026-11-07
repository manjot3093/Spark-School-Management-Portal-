import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Download,
  CheckCircle,
  UserCheck,
  BookMarked,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAuthor, setFilterAuthor] = useState('all');
  const [borrowSearchTerm, setBorrowSearchTerm] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [borrowingRecords, setBorrowingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [bookPage, setBookPage] = useState(1);
  const [bookPageSize, setBookPageSize] = useState(10);
  const [borrowPage, setBorrowPage] = useState(1);
  const [borrowPageSize, setBorrowPageSize] = useState(10);
  const [borrowForm, setBorrowForm] = useState({
    bookId: '',
    studentId: '',
    dueDate: ''
  });
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    copies: ''
  });
  // Report states
  const [reportType, setReportType] = useState('overview');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Admission number search states for borrow modal
  const [studentAdmissionSearch, setStudentAdmissionSearch] = useState('');
  const [selectedBorrowStudent, setSelectedBorrowStudent] = useState<any>(null);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  // Filtered students for borrow modal autocomplete
  const filteredBorrowStudents = students.filter(student => {
    if (!studentAdmissionSearch) return false;
    const searchLower = studentAdmissionSearch.toLowerCase();
    return (
      (student as any).admissionNumber?.toLowerCase().includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower) ||
      student.rollNumber?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  // Admission number search states for reports
  const [reportStudentSearch, setReportStudentSearch] = useState('');
  const [selectedReportStudent, setSelectedReportStudent] = useState<any>(null);
  const [showReportSuggestions, setShowReportSuggestions] = useState(false);

  // Filtered students for reports autocomplete
  const filteredReportStudents = students.filter(student => {
    if (!reportStudentSearch) return false;
    const searchLower = reportStudentSearch.toLowerCase();
    return (
      (student as any).admissionNumber?.toLowerCase().includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower) ||
      student.rollNumber?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  useEffect(() => {
    fetchBooks();
    fetchStudents();
    fetchBorrowingRecords();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) {
        toast.error('School ID not found. Please login again.');
        return;
      }
      const response = await api.library.getBooks({ schoolId });
      const booksData = response?.data || response || [];
      // Normalize book data: map name->title and quantity->copies for display
      const normalizedBooks = booksData.map((book: any) => ({
        ...book,
        title: book.name || book.title,
        copies: book.quantity || book.copies || 0
      }));
      setBooks(normalizedBooks);
    } catch (error) {
      toast.error('Failed to fetch books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author || !newBook.isbn) {
      toast.error('Please fill in all required fields');
      return;
    }
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      toast.error('School ID not found. Please login again.');
      return;
    }
    try {
      await api.library.createBook({
        name: newBook.title,
        author: newBook.author,
        isbn: newBook.isbn,
        category: newBook.category,
        quantity: parseInt(newBook.copies) || 0,
        schoolId: schoolId
      });
      toast.success('Book added successfully!');
      setNewBook({ title: '', author: '', isbn: '', category: '', copies: '' });
      setShowAddBookModal(false);
      fetchBooks();
    } catch (error) {
      toast.error('Failed to add book');
    }
  };

  const handleEditBook = (book: any) => {
    setEditingBook(book);
    setNewBook({
      title: book.name || book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || '',
      copies: String(book.quantity || book.copies || '')
    });
    setShowEditBookModal(true);
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author || !newBook.isbn) {
      toast.error('Please fill in all required fields');
      return;
    }
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      toast.error('School ID not found. Please login again.');
      return;
    }
    if (!editingBook?._id) {
      toast.error('Book ID not found');
      return;
    }
    try {
      await api.library.updateBook(editingBook._id, {
        name: newBook.title,
        author: newBook.author,
        isbn: newBook.isbn,
        category: newBook.category,
        quantity: parseInt(newBook.copies) || 0,
        schoolId: schoolId
      });
      toast.success('Book updated successfully!');
      setNewBook({ title: '', author: '', isbn: '', category: '', copies: '' });
      setShowEditBookModal(false);
      setEditingBook(null);
      fetchBooks();
    } catch (error) {
      toast.error('Failed to update book');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }
    try {
      await api.library.deleteBook(id);
      toast.success('Book deleted successfully!');
      fetchBooks();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete book');
    }
  };

  const fetchStudents = async () => {
    try {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) return;
      const response = await api.students.getAll();
      setStudents(response?.data || response || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchBorrowingRecords = async () => {
    try {
      const schoolId = localStorage.getItem('schoolId');
      if (!schoolId) return;
      const response = await api.library.getBorrowRecords({ schoolId });
      setBorrowingRecords(response?.data || response || []);
    } catch (error) {
      console.error('Failed to fetch borrowing records:', error);
    }
  };

  const handleBorrowBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowForm.bookId || !borrowForm.studentId) {
      toast.error('Please select a book and student');
      return;
    }
    const schoolId = localStorage.getItem('schoolId');
    if (!schoolId) {
      toast.error('School ID not found. Please login again.');
      return;
    }
    try {
      await api.library.borrowBook({
        bookId: borrowForm.bookId,
        studentId: borrowForm.studentId,
        schoolId: schoolId,
        dueDate: borrowForm.dueDate || undefined
      });
      toast.success('Book borrowed successfully!');
      setBorrowForm({ bookId: '', studentId: '', dueDate: '' });
      setShowBorrowModal(false);
      fetchBooks();
      fetchBorrowingRecords();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to borrow book');
    }
  };

  const handleReturnBook = async (id: string) => {
    if (!window.confirm('Are you sure you want to return this book?')) {
      return;
    }
    try {
      await api.library.returnBook(id, {});
      toast.success('Book returned successfully!');
      fetchBooks();
      fetchBorrowingRecords();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to return book');
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = (book.title || book.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || book.category === filterCategory;
    const matchesAuthor = filterAuthor === 'all' || (book.author || '').toLowerCase() === filterAuthor.toLowerCase();
    return matchesSearch && matchesCategory && matchesAuthor;
  });

  // --- Modern Library Dashboard Layout ---
  const getAvailableBooks = () => {
    let totalAvailable = 0;
    books.forEach(book => {
      const totalCopies = book.quantity || book.copies || 0;
      const borrowedCount = borrowingRecords.filter((r: any) => {
        const rBookId = typeof r.bookId === 'object' ? r.bookId?._id : r.bookId;
        return rBookId === book._id && r.status === 'borrowed';
      }).length;
      totalAvailable += Math.max(0, totalCopies - borrowedCount);
    });
    return totalAvailable;
  };
  const getCategories = () => {
    const cats = new Set();
    books.forEach(b => b.category && cats.add(b.category));
    return Array.from(cats).sort();
  };

  const getAuthors = () => {
    const authors = new Set();
    books.forEach(b => b.author && authors.add(b.author));
    return Array.from(authors).sort();
  };
  const totalBooks = books.length;
  const availableBooks = getAvailableBooks();
  const totalBorrowed = borrowingRecords.filter((r: any) => r.status === 'borrowed').length;
  const totalStudents = students.length;
  const categoriesCount = getCategories().length;

  const summaryCards = [
    {
      label: 'Total Books',
      value: totalBooks,
      sub: 'In library collection',
      icon: <BookOpen className="h-7 w-7 text-blue-500" />, color: 'border-blue-500',
    },
    {
      label: 'Available Books',
      value: availableBooks,
      sub: 'Ready to borrow',
      icon: <CheckCircle className="h-7 w-7 text-green-500" />, color: 'border-green-500',
    },
    {
      label: 'Borrowed Books',
      value: totalBorrowed,
      sub: 'Currently borrowed',
      icon: <Users className="h-7 w-7 text-purple-500" />, color: 'border-purple-500',
    },
    {
      label: 'Categories',
      value: categoriesCount,
      sub: 'Book types',
      icon: <BookMarked className="h-7 w-7 text-orange-500" />, color: 'border-orange-500',
    },
  ];

  const quickActions = [
    { label: 'Add Book', color: 'bg-blue-600', icon: <Plus className="h-5 w-5" />, onClick: () => setShowAddBookModal(true) },
    { label: 'Borrow Book', color: 'bg-green-600', icon: <CheckCircle className="h-5 w-5" />, onClick: () => setShowBorrowModal(true) },
    //{ label: 'Add Member', color: 'bg-purple-600', icon: <Users className="h-5 w-5" />, onClick: () => {} },
    //{ label: 'Export Report', color: 'bg-orange-600', icon: <Download className="h-5 w-5" />, onClick: () => {} },
  ];

  const renderLibraryDashboard = () => (
    <div className="space-y-6 [font-family:DM_Sans,sans-serif]">
      {/* Title & Subtitle */}
      <div className="relative overflow-hidden rounded-2xl border border-[#dce6ec] bg-[#e9f1f5] p-6 sm:p-8">
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border-[28px] border-white/40 pointer-events-none" />
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[.22em] text-[#ba6030]">Campus resources / Library</p>
        <h1 className="text-3xl font-extrabold tracking-[-.05em] text-[#17283c] sm:text-4xl [font-family:Manrope,sans-serif]">A library in motion<span className="text-[#e7773b]">.</span></h1>
        <p className="mt-2 text-[#52697b]">Manage your collection, circulation and the books students are reading.</p>
      </div>
      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
        <div className="flex-1 flex items-center bg-white rounded-lg shadow px-4 py-2">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search books or authors..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-800"
          />
          <Filter className="h-5 w-5 text-gray-400 ml-2" />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="ml-0 md:ml-4 px-4 py-2 border border-gray-300 rounded-lg bg-white shadow"
          style={{ minWidth: 160 }}
        >
          <option value="all">All Categories</option>
          {getCategories().map(cat => (
            <option key={String(cat)} value={String(cat)}>{String(cat)}</option>
          ))}
        </select>
        <select
          value={filterAuthor}
          onChange={e => setFilterAuthor(e.target.value)}
          className="ml-0 md:ml-4 px-4 py-2 border border-gray-300 rounded-lg bg-white shadow"
          style={{ minWidth: 160 }}
        >
          <option value="all">All Authors</option>
          {getAuthors().map(author => (
            <option key={String(author)} value={String(author)}>{String(author)}</option>
          ))}
        </select>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryCards.map(card => (
          <div key={card.label} className={`bg-white rounded-xl border border-[#dfe7ed] p-4 sm:p-6 border-l-4 ${card.color} flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none`}>
            <div className="p-3 bg-gray-100 rounded-full">{card.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mt-2">
        {quickActions.map(action => (
          <button key={action.label} onClick={action.onClick} className={`flex items-center px-5 py-2 rounded-lg text-white font-semibold shadow ${action.color} hover:opacity-90 transition`}>
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </button>
        ))}
      </div>
      {/* Tabs */}
      <div className="mt-6">
        <div className="flex gap-6 overflow-x-auto border-b border-[#dfe7ed] mb-5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >Library Overview</button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'manage' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >Book Management</button>
          <button
            onClick={() => setActiveTab('borrowings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'borrowings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >Borrowings</button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >Library Reports</button>
        </div>
        <div>
          {activeTab === 'dashboard' && renderLibraryOverview()}
          {activeTab === 'manage' && renderBookManagement()}
          {activeTab === 'borrowings' && renderBorrowings()}
          {activeTab === 'reports' && renderReports()}
        </div>
      </div>
    </div>
  );

  const renderLibraryOverview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Library Overview</h3>
        <button
          onClick={() => setShowAddBookModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Book</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No books found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book Title</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Author</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ISBN</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Copies</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{book.title || book.name || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{book.author || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{book.isbn || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{book.category || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{book.copies || book.quantity || 0}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditBook(book)}
                          className="text-green-600 hover:text-green-800 text-sm"
                          title="Edit book"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="Delete book"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderBookManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Manage Books</h3>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search by Title or Author</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Enter title or author name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {getCategories().map((category) => (
                <option key={String(category)} value={String(category)}>
                  {String(category)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Author</label>
            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Authors</option>
              {getAuthors().map((author) => (
                <option key={String(author)} value={String(author)}>
                  {String(author)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowAddBookModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Book</span>
          </button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading books...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No books found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Author</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ISBN</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Copies</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks
                    .slice((bookPage - 1) * bookPageSize, bookPage * bookPageSize)
                    .map((book) => (
                    <tr key={book._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{book.title || book.name || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{book.author || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{book.isbn || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{book.category || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{book.copies || book.quantity || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditBook(book)}
                            className="text-green-600 hover:text-green-800 text-sm"
                            title="Edit book"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book._id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Delete book"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredBooks.length > 0 && (
            <Pagination
              currentPage={bookPage}
              pageSize={bookPageSize}
              totalItems={filteredBooks.length}
              onPageChange={setBookPage}
              onPageSizeChange={setBookPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>
      </div>
    </div>
  );

  const renderBorrowings = () => {
    // Filter borrowings by student name search
    const filteredActiveBorrowings = borrowingRecords.filter((record: any) => {
      if (record.status !== 'borrowed') return false;
      if (!borrowSearchTerm) return true;
      const studentName = (record.studentId?.name || '').toLowerCase();
      const rollNumber = (record.studentId?.rollNumber || '').toLowerCase();
      const searchLower = borrowSearchTerm.toLowerCase();
      return studentName.includes(searchLower) || rollNumber.includes(searchLower);
    });

    const filteredReturnedBorrowings = borrowingRecords.filter((record: any) => {
      if (record.status !== 'returned') return false;
      if (!borrowSearchTerm) return true;
      const studentName = (record.studentId?.name || '').toLowerCase();
      const rollNumber = (record.studentId?.rollNumber || '').toLowerCase();
      const searchLower = borrowSearchTerm.toLowerCase();
      return studentName.includes(searchLower) || rollNumber.includes(searchLower);
    });

    // Combined view for collective borrowers
    const allBorrowings = [...filteredActiveBorrowings, ...filteredReturnedBorrowings];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Book Borrowings</h3>
          <button
            onClick={() => setShowBorrowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Borrow Book</span>
          </button>
        </div>

        {/* Search for Student Name */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Student Name or Roll Number</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter student name or roll number"
                  value={borrowSearchTerm}
                  onChange={(e) => setBorrowSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {borrowSearchTerm && (
              <button
                onClick={() => setBorrowSearchTerm('')}
                className="mt-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Collective Borrowers View */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">All Borrowers ({allBorrowings.length})</h4>
          {allBorrowings.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No borrowings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Borrow Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Return Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allBorrowings
                    .slice((borrowPage - 1) * borrowPageSize, borrowPage * borrowPageSize)
                    .map((record: any) => (
                    <tr key={record._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{record.bookId?.name || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {record.studentId?.name || 'N/A'}
                        {record.studentId?.rollNumber && ` (${record.studentId.rollNumber})`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.borrowDate ? new Date(record.borrowDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.returnDate ? new Date(record.returnDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {record.status === 'borrowed' ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Returned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {record.status === 'borrowed' ? (
                          <button
                            onClick={() => handleReturnBook(record._id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Return
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {allBorrowings.length > 0 && (
            <Pagination
              currentPage={borrowPage}
              pageSize={borrowPageSize}
              totalItems={allBorrowings.length}
              onPageChange={setBorrowPage}
              onPageSizeChange={setBorrowPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>

        {/* Active Borrowings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Active Borrowings ({filteredActiveBorrowings.length})</h4>
          {filteredActiveBorrowings.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No active borrowings</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Borrow Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveBorrowings.map((record: any) => (
                    <tr key={record._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{record.bookId?.name || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {record.studentId?.name || 'N/A'}
                        {record.studentId?.rollNumber && ` (${record.studentId.rollNumber})`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.borrowDate ? new Date(record.borrowDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.dueDate ? new Date(record.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleReturnBook(record._id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Return
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Returned Borrowings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Returned Books ({filteredReturnedBorrowings.length})</h4>
          {filteredReturnedBorrowings.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No returned books</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Borrow Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Return Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturnedBorrowings.map((record: any) => (
                    <tr key={record._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{record.bookId?.name || 'N/A'}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {record.studentId?.name || 'N/A'}
                        {record.studentId?.rollNumber && ` (${record.studentId.rollNumber})`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.borrowDate ? new Date(record.borrowDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {record.returnDate ? new Date(record.returnDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Returned
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  const exportReportPDF = (title: string, content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .summary { display: flex; gap: 20px; margin: 20px 0; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
            .summary-card h3 { margin: 0 0 10px 0; color: #666; }
            .summary-card p { margin: 5px 0; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const renderReports = () => {
    const activeBorrowings = borrowingRecords.filter((r: any) => r.status === 'borrowed');
    const returnedBorrowings = borrowingRecords.filter((r: any) => r.status === 'returned');
    const overdueBorrowings = activeBorrowings.filter((r: any) => {
      if (!r.dueDate) return false;
      return new Date(r.dueDate) < new Date();
    });

    // Filter borrowings for student-based report
    let filteredBorrowingsForReport = borrowingRecords;
    if (reportType === 'student' && selectedStudentId) {
      filteredBorrowingsForReport = borrowingRecords.filter((r: any) => {
        const studentId = typeof r.studentId === 'object' ? r.studentId?._id : r.studentId;
        return studentId === selectedStudentId;
      });
    }

    // Apply date filter if provided
    if (reportStartDate || reportEndDate) {
      filteredBorrowingsForReport = filteredBorrowingsForReport.filter((r: any) => {
        const borrowDate = r.borrowDate ? new Date(r.borrowDate) : null;
        if (!borrowDate) return false;
        if (reportStartDate && borrowDate < new Date(reportStartDate)) return false;
        if (reportEndDate && borrowDate > new Date(reportEndDate + 'T23:59:59')) return false;
        return true;
      });
    }

    const handleExportOverview = () => {
      const reportData = [
        { Metric: 'Total Books', Value: books.length },
        { Metric: 'Available Books', Value: getAvailableBooks() },
        { Metric: 'Borrowed Books', Value: activeBorrowings.length },
        { Metric: 'Returned Books', Value: returnedBorrowings.length },
        { Metric: 'Overdue Books', Value: overdueBorrowings.length },
        { Metric: 'Total Categories', Value: getCategories().length },
        { Metric: 'Total Students', Value: students.length },
      ];
      exportToCSV(reportData, 'library_overview');
    };

    const handleExportBorrowings = () => {
      const reportData = filteredBorrowingsForReport.map((r: any) => ({
        'Book Name': r.bookId?.name || 'N/A',
        'Student Name': r.studentId?.name || 'N/A',
        'Roll Number': r.studentId?.rollNumber || 'N/A',
        'Borrow Date': r.borrowDate ? new Date(r.borrowDate).toLocaleDateString() : 'N/A',
        'Due Date': r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A',
        'Return Date': r.returnDate ? new Date(r.returnDate).toLocaleDateString() : 'N/A',
        'Status': r.status || 'N/A',
        'Overdue': r.dueDate && new Date(r.dueDate) < new Date() && r.status === 'borrowed' ? 'Yes' : 'No'
      }));
      exportToCSV(reportData, 'library_borrowings');
    };

    const handleExportPDF = () => {
      let content = `
        <h1>Library Report</h1>
        <div class="summary">
          <div class="summary-card">
            <h3>Total Books</h3>
            <p>${books.length}</p>
          </div>
          <div class="summary-card">
            <h3>Available Books</h3>
            <p>${getAvailableBooks()}</p>
          </div>
          <div class="summary-card">
            <h3>Borrowed Books</h3>
            <p>${activeBorrowings.length}</p>
          </div>
          <div class="summary-card">
            <h3>Overdue Books</h3>
            <p>${overdueBorrowings.length}</p>
          </div>
        </div>
      `;

      if (reportType === 'student' && selectedStudentId) {
        const student = students.find(s => s._id === selectedStudentId);
        content += `<h2>Student Report: ${student?.name || 'N/A'}</h2>`;
      }

      content += `
        <h2>Borrowing History</h2>
        <table>
          <thead>
            <tr>
              <th>Book Name</th>
              <th>Student Name</th>
              <th>Borrow Date</th>
              <th>Due Date</th>
              <th>Return Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      filteredBorrowingsForReport.forEach((r: any) => {
        content += `
          <tr>
            <td>${r.bookId?.name || 'N/A'}</td>
            <td>${r.studentId?.name || 'N/A'}</td>
            <td>${r.borrowDate ? new Date(r.borrowDate).toLocaleDateString() : 'N/A'}</td>
            <td>${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A'}</td>
            <td>${r.returnDate ? new Date(r.returnDate).toLocaleDateString() : '-'}</td>
            <td>${r.status || 'N/A'}</td>
          </tr>
        `;
      });

      content += `
          </tbody>
        </table>
      `;

      exportReportPDF('Library Report', content);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Library Reports</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportOverview}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Overview (CSV)</span>
            </button>
            <button
              onClick={handleExportBorrowings}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Borrowings (CSV)</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setReportType('overview')}
              className={`px-4 py-2 rounded-md font-medium ${reportType === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Overview Report
            </button>
            <button
              onClick={() => setReportType('student')}
              className={`px-4 py-2 rounded-md font-medium ${reportType === 'student'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Student-Based Report
            </button>
          </div>

          {/* Student-Based Report Filters */}
          {reportType === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Admission Number</label>
                <input
                  type="text"
                  value={reportStudentSearch}
                  onChange={(e) => {
                    setReportStudentSearch(e.target.value);
                    setShowReportSuggestions(true);
                    if (!e.target.value) {
                      setSelectedStudentId('');
                      setSelectedReportStudent(null);
                    }
                  }}
                  onFocus={() => setShowReportSuggestions(true)}
                  placeholder="Search by admission number, name, or roll number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Student Suggestions Dropdown */}
                {showReportSuggestions && filteredReportStudents.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredReportStudents.map(student => (
                      <div
                        key={student._id}
                        onClick={() => {
                          setSelectedReportStudent(student);
                          setReportStudentSearch((student as any).admissionNumber || student.name);
                          setSelectedStudentId(student._id);
                          setShowReportSuggestions(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">
                          Admission: {(student as any).admissionNumber || 'N/A'} | Roll: {student.rollNumber || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Student Display */}
                {selectedReportStudent && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedReportStudent.name} - {(selectedReportStudent as any).admissionNumber || selectedReportStudent.rollNumber}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Overview Report */}
          {reportType === 'overview' && (
            <div className="space-y-6">
              <h4 className="text-md font-semibold text-gray-900">Library Statistics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">Total Books</p>
                  <p className="text-2xl font-bold text-blue-600">{books.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Available Books</p>
                  <p className="text-2xl font-bold text-green-600">{getAvailableBooks()}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600">Borrowed Books</p>
                  <p className="text-2xl font-bold text-yellow-600">{activeBorrowings.length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600">Overdue Books</p>
                  <p className="text-2xl font-bold text-red-600">{overdueBorrowings.length}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600">Returned Books</p>
                  <p className="text-2xl font-bold text-purple-600">{returnedBorrowings.length}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-sm text-gray-600">Total Categories</p>
                  <p className="text-2xl font-bold text-indigo-600">{getCategories().length}</p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-pink-600">{students.length}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                  <p className="text-sm text-gray-600">Total Authors</p>
                  <p className="text-2xl font-bold text-teal-600">{getAuthors().length}</p>
                </div>
              </div>

              {/* Overdue Books List */}
              {overdueBorrowings.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Overdue Books</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueBorrowings.map((record: any) => {
                          const dueDate = new Date(record.dueDate);
                          const today = new Date();
                          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={record._id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{record.bookId?.name || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.name || 'N/A'}</td>
                              <td className="py-3 px-4">{dueDate.toLocaleDateString()}</td>
                              <td className="py-3 px-4 text-red-600 font-semibold">{daysOverdue} days</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Student-Based Report */}
          {reportType === 'student' && (
            <div className="space-y-6">
              {selectedStudentId ? (
                <>
                  {(() => {
                    const student = students.find(s => s._id === selectedStudentId);
                    const studentBorrowings = filteredBorrowingsForReport;
                    const studentActive = studentBorrowings.filter((r: any) => r.status === 'borrowed');
                    const studentReturned = studentBorrowings.filter((r: any) => r.status === 'returned');
                    const studentOverdue = studentActive.filter((r: any) => {
                      if (!r.dueDate) return false;
                      return new Date(r.dueDate) < new Date();
                    });

                    return (
                      <>
                        <div>
                          <h4 className="text-md font-semibold text-gray-900 mb-4">
                            Report for: {student?.name || 'N/A'} {student?.rollNumber ? `(${student.rollNumber})` : ''}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <p className="text-sm text-gray-600">Total Borrowed</p>
                              <p className="text-2xl font-bold text-blue-600">{studentBorrowings.length}</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <p className="text-sm text-gray-600">Currently Borrowed</p>
                              <p className="text-2xl font-bold text-yellow-600">{studentActive.length}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <p className="text-sm text-gray-600">Overdue</p>
                              <p className="text-2xl font-bold text-red-600">{studentOverdue.length}</p>
                            </div>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Book Name</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Borrow Date</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Return Date</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Overdue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentBorrowings.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-gray-500">
                                    No borrowing records found
                                  </td>
                                </tr>
                              ) : (
                                studentBorrowings.map((record: any) => {
                                  const isOverdue = record.dueDate && new Date(record.dueDate) < new Date() && record.status === 'borrowed';
                                  const dueDate = record.dueDate ? new Date(record.dueDate) : null;
                                  const daysOverdue = isOverdue && dueDate
                                    ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                                    : 0;
                                  return (
                                    <tr key={record._id} className="border-b hover:bg-gray-50">
                                      <td className="py-3 px-4">{record.bookId?.name || 'N/A'}</td>
                                      <td className="py-3 px-4">
                                        {record.borrowDate ? new Date(record.borrowDate).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td className="py-3 px-4">
                                        {dueDate ? dueDate.toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td className="py-3 px-4">
                                        {record.returnDate ? new Date(record.returnDate).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="py-3 px-4">
                                        {record.status === 'borrowed' ? (
                                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            Active
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            Returned
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        {isOverdue ? (
                                          <span className="text-red-600 font-semibold">{daysOverdue} days</span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Please select a student to view their borrowing report</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {renderLibraryDashboard()}
      {/* Add Book Modal */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Book</h3>
              <form onSubmit={handleAddBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book Title *</label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter book title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author *</label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter author name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ISBN *</label>
                  <input
                    type="text"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter ISBN number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    list="categories"
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    placeholder="Select or enter category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="categories">
                    {getCategories().map((category) => (
                      <option key={String(category)} value={String(category)} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Copies *</label>
                  <input
                    type="number"
                    value={newBook.copies}
                    onChange={(e) => setNewBook({ ...newBook, copies: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter number of copies"
                    min="1"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBookModal(false);
                      setNewBook({ title: '', author: '', isbn: '', category: '', copies: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditBookModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Book</h3>
              <form onSubmit={handleUpdateBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book Title *</label>
                  <input
                    type="text"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter book title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author *</label>
                  <input
                    type="text"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter author name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ISBN *</label>
                  <input
                    type="text"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter ISBN number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    list="categories"
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    placeholder="Select or enter category"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="categories">
                    {getCategories().map((category) => (
                      <option key={String(category)} value={String(category)} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Copies *</label>
                  <input
                    type="number"
                    value={newBook.copies}
                    onChange={(e) => setNewBook({ ...newBook, copies: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter number of copies"
                    min="1"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditBookModal(false);
                      setEditingBook(null);
                      setNewBook({ title: '', author: '', isbn: '', category: '', copies: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Borrow Book Modal */}
      {showBorrowModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Borrow Book</h3>
              <form onSubmit={handleBorrowBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Book *</label>
                  <select
                    value={borrowForm.bookId}
                    onChange={(e) => setBorrowForm({ ...borrowForm, bookId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a book</option>
                    {books.filter(book => {
                      const borrowedCount = borrowingRecords.filter((r: any) => {
                        const rBookId = typeof r.bookId === 'object' ? r.bookId?._id : r.bookId;
                        return rBookId === book._id && r.status === 'borrowed';
                      }).length;
                      return (book.quantity || book.copies || 0) > borrowedCount;
                    }).map((book) => (
                      <option key={book._id} value={book._id}>
                        {book.title || book.name} - {book.author || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Admission Number *</label>
                  <input
                    type="text"
                    value={studentAdmissionSearch}
                    onChange={(e) => {
                      setStudentAdmissionSearch(e.target.value);
                      setShowStudentSuggestions(true);
                      if (!e.target.value) {
                        setBorrowForm({ ...borrowForm, studentId: '' });
                        setSelectedBorrowStudent(null);
                      }
                    }}
                    onFocus={() => setShowStudentSuggestions(true)}
                    placeholder="Enter admission number or student name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />

                  {/* Student Suggestions Dropdown */}
                  {showStudentSuggestions && filteredBorrowStudents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredBorrowStudents.map(student => (
                        <div
                          key={student._id}
                          onClick={() => {
                            setSelectedBorrowStudent(student);
                            setStudentAdmissionSearch((student as any).admissionNumber || student.name);
                            setBorrowForm({ ...borrowForm, studentId: student._id });
                            setShowStudentSuggestions(false);
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">
                            Admission: {(student as any).admissionNumber || 'N/A'} | Roll: {student.rollNumber || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Student Display */}
                  {selectedBorrowStudent && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">
                        Selected: {selectedBorrowStudent.name} - {(selectedBorrowStudent as any).admissionNumber || selectedBorrowStudent.rollNumber}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={borrowForm.dueDate}
                    onChange={(e) => setBorrowForm({ ...borrowForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBorrowModal(false);
                      setBorrowForm({ bookId: '', studentId: '', dueDate: '' });
                      setStudentAdmissionSearch('');
                      setSelectedBorrowStudent(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Borrow Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;

