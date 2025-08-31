'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  LogOut,
  Settings,
  Bell,
  Search,
  Plus,
  MapPin,
  Phone,
  Mail,
  FileText,
  BarChart3,
  UserPlus,
  CalendarPlus,
  MessageSquare,
  Download,
  Eye
} from 'lucide-react';

interface DashboardStats {
  totalVisitors: number;
  todayVisits: number;
  activeQueue: number;
  pendingIssues: number;
  todayAppointments: number;
  completedVisits: number;
  youthWithResumes: number;
  averageSatisfaction: number;
  monthlyStats: {
    visits: number;
    issues: number;
    resolvedIssues: number;
    resolutionRate: number;
  };
}

interface QueueItem {
  id: string;
  visitor: {
    id: string;
    name: string;
    phone: string;
    village: string;
    district: string;
    category: string;
  };
  user: {
    id: string;
    name: string;
    role: string;
  };
  checkInTime: string;
  purpose?: string;
  appointment?: {
    priority: string;
    title: string;
  };
}

interface RecentIssue {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  village?: string;
  district?: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalVisitors: 0,
    todayVisits: 0,
    activeQueue: 0,
    pendingIssues: 0,
    todayAppointments: 0,
    completedVisits: 0,
    youthWithResumes: 0,
    averageSatisfaction: 0,
    monthlyStats: {
      visits: 0,
      issues: 0,
      resolvedIssues: 0,
      resolutionRate: 0,
    },
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    try {
      setUser(JSON.parse(userData));
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Load dashboard stats
      const [statsRes, queueRes, issuesRes] = await Promise.all([
        fetch('/api/analytics/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/queue', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/issues?limit=5&status=OPEN&status=IN_PROGRESS', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData.activeVisits || []);
      }

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setRecentIssues(issuesData.issues || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-visitor':
        router.push('/visitors/add');
        break;
      case 'schedule-appointment':
        router.push('/appointments/schedule');
        break;
      case 'log-issue':
        router.push('/issues/add');
        break;
      case 'generate-report':
        router.push('/reports');
        break;
      case 'view-queue':
        router.push('/queue');
        break;
      default:
        break;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'NORMAL': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'POLITICIAN': return 'bg-blue-100 text-blue-800';
      case 'STAFF': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">VM</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Visitor Management</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
                <span className="text-sm font-medium text-gray-700">
                  {user.name || user.email}
                </span>
              </div>
              
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name || user.email}!
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your constituency today.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('add-visitor')}
            >
              <UserPlus className="w-6 h-6" />
              <span className="text-xs">Add Visitor</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('schedule-appointment')}
            >
              <CalendarPlus className="w-6 h-6" />
              <span className="text-xs">Schedule</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('log-issue')}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs">Log Issue</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('generate-report')}
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-xs">Reports</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => handleQuickAction('view-queue')}
            >
              <Eye className="w-6 h-6" />
              <span className="text-xs">View Queue</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVisitors}</div>
              <p className="text-xs text-muted-foreground">
                Registered constituents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayVisits}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedVisits} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Queue</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeQueue}</div>
              <p className="text-xs text-muted-foreground">
                Visitors waiting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingIssues}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled meetings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageSatisfaction.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Average rating
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Youth with Resumes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.youthWithResumes}</div>
              <p className="text-xs text-muted-foreground">
                Employment ready
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled meetings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyStats.resolutionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Monthly resolution
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Active Queue
                </span>
                <Badge variant="outline">{queue.length} waiting</Badge>
              </CardTitle>
              <CardDescription>
                Visitors currently in the queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {queue.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No visitors in queue</p>
                  </div>
                ) : (
                  queue.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.visitor.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">
                            {item.visitor.village}, {item.visitor.district}
                          </span>
                        </div>
                        {item.appointment && (
                          <Badge variant="outline" className={`text-xs mt-1 ${getPriorityColor(item.appointment.priority)} text-white`}>
                            {item.appointment.priority}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-gray-500">
                          {new Date(item.checkInTime).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.user.name}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent Issues
                </span>
                <Badge variant="outline">{recentIssues.length} pending</Badge>
              </CardTitle>
              <CardDescription>
                Issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentIssues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No pending issues</p>
                  </div>
                ) : (
                  recentIssues.map((issue) => (
                    <div key={issue.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {issue.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(issue.priority)} text-white`}>
                            {issue.priority}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(issue.status)}`}>
                            {issue.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <span className="bg-gray-200 px-2 py-1 rounded">{issue.category}</span>
                        {issue.village && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {issue.village}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Plus className="w-6 h-6 mb-2" />
                <span className="text-sm">Check In Visitor</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Calendar className="w-6 h-6 mb-2" />
                <span className="text-sm">Schedule Appointment</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <AlertTriangle className="w-6 h-6 mb-2" />
                <span className="text-sm">Log Issue</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Search className="w-6 h-6 mb-2" />
                <span className="text-sm">Search Visitor</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}