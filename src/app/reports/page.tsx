'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  BarChart3, 
  Calendar, 
  Users,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Filter,
  RefreshCw,
  Eye,
  Search
} from 'lucide-react';

interface ReportFilters {
  type: string;
  startDate: string;
  endDate: string;
  village: string;
  district: string;
  category: string;
  format: string;
}

interface ReportData {
  visitors?: any[];
  appointments?: any[];
  visits?: any[];
  issues?: any[];
  youthVisitors?: any[];
  summary?: any;
  metadata?: any;
}

export default function ReportsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'comprehensive',
    startDate: '',
    endDate: '',
    village: '',
    district: '',
    category: '',
    format: 'json',
  });

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkAuth();
    // Set default date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFilters(prev => ({ ...prev, startDate, endDate }));
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const generateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      setError('Start date and end date are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        type: filters.type,
        startDate: filters.startDate,
        endDate: filters.endDate,
        format: filters.format,
        ...(filters.village && { village: filters.village }),
        ...(filters.district && { district: filters.district }),
        ...(filters.category && { category: filters.category }),
      });

      const response = await fetch(`/api/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!reportData) return;

    setDownloading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        type: filters.type,
        startDate: filters.startDate,
        endDate: filters.endDate,
        format: 'csv',
        ...(filters.village && { village: filters.village }),
        ...(filters.district && { district: filters.district }),
        ...(filters.category && { category: filters.category }),
      });

      const response = await fetch(`/api/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filters.type}_report_${filters.startDate}_to_${filters.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download report');
      }
    } catch (err) {
      console.error('Download error:', err);
      setError('Network error while downloading');
    } finally {
      setDownloading(false);
    }
  };

  const getReportTypeDescription = (type: string) => {
    switch (type) {
      case 'visitors':
        return 'Visitor demographics, registration trends, and geographic distribution';
      case 'appointments':
        return 'Scheduling efficiency, attendance rates, and staff performance';
      case 'visits':
        return 'Visit duration analysis, satisfaction ratings, and purpose categorization';
      case 'issues':
        return 'Issue resolution rates, cost analysis, and department performance';
      case 'youth':
        return 'Youth demographics, resume coverage, and employment tracking';
      case 'comprehensive':
        return 'Complete overview of all system activities and performance metrics';
      default:
        return 'Custom report based on selected filters';
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'visitors':
        return <Users className="w-5 h-5" />;
      case 'appointments':
        return <Calendar className="w-5 h-5" />;
      case 'visits':
        return <Eye className="w-5 h-5" />;
      case 'issues':
        return <AlertTriangle className="w-5 h-5" />;
      case 'youth':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const renderReportSummary = () => {
    if (!reportData) return null;

    const summary = reportData.summary || reportData.metadata?.summary || {};
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(summary).map(([key, value]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">VM</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Reports & Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Report Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Generate Report
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </CardTitle>
            <CardDescription>
              Configure and generate customized reports for your constituency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report Type Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Report Type</h3>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                    <SelectItem value="visitors">Visitor Analytics</SelectItem>
                    <SelectItem value="appointments">Appointment Analytics</SelectItem>
                    <SelectItem value="visits">Visit Analytics</SelectItem>
                    <SelectItem value="issues">Issue Analytics</SelectItem>
                    <SelectItem value="youth">Youth & Employment</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-2">
                  {getReportTypeDescription(filters.type)}
                </p>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Date Range</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Actions</h3>
                <div className="space-y-3">
                  <Button 
                    onClick={generateReport} 
                    disabled={loading || !filters.startDate || !filters.endDate}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  
                  {reportData && (
                    <Button 
                      onClick={downloadReport} 
                      disabled={downloading}
                      variant="outline"
                      className="w-full"
                    >
                      {downloading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download CSV
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Additional Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="village">Village</Label>
                    <Input
                      id="village"
                      placeholder="Filter by village"
                      value={filters.village}
                      onChange={(e) => handleFilterChange('village', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      placeholder="Filter by district"
                      value={filters.district}
                      onChange={(e) => handleFilterChange('district', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FARMER">Farmer</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="YOUTH">Youth</SelectItem>
                        <SelectItem value="WOMEN">Women</SelectItem>
                        <SelectItem value="SENIOR_CITIZEN">Senior Citizen</SelectItem>
                        <SelectItem value="BUSINESSMAN">Businessman</SelectItem>
                        <SelectItem value="LABORER">Laborer</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Results */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getReportTypeIcon(filters.type)}
                  {filters.type.charAt(0).toUpperCase() + filters.type.slice(1)} Report
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {filters.startDate} to {filters.endDate}
                  </Badge>
                  {reportData.metadata?.totalRecords !== undefined && (
                    <Badge variant="outline">
                      {reportData.metadata.totalRecords} records
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Report generated on {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Summary Statistics */}
              {renderReportSummary()}

              {/* Report Data Preview */}
              <div className="space-y-6">
                {filters.type === 'visitors' && reportData.visitors && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Visitor Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">By Category</h5>
                        <div className="space-y-2">
                          {Object.entries(reportData.categoryStats || {}).map(([category, count]) => (
                            <div key={category} className="flex justify-between items-center">
                              <span className="capitalize">{category.replace(/_/g, ' ').toLowerCase()}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">By Village</h5>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(reportData.villageStats || {}).map(([village, count]) => (
                            <div key={village} className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {village}
                              </span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {filters.type === 'appointments' && reportData.appointments && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Appointment Analytics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">By Status</h5>
                        <div className="space-y-2">
                          {Object.entries(reportData.statusStats || {}).map(([status, count]) => (
                            <div key={status} className="flex justify-between items-center">
                              <span className="capitalize">{status.replace(/_/g, ' ').toLowerCase()}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">By Priority</h5>
                        <div className="space-y-2">
                          {Object.entries(reportData.priorityStats || {}).map(([priority, count]) => (
                            <div key={priority} className="flex justify-between items-center">
                              <span className="capitalize">{priority.toLowerCase()}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {filters.type === 'youth' && reportData.youthVisitors && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Youth Employment Analytics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">Education Level</h5>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(reportData.educationStats || {}).map(([education, count]) => (
                            <div key={education} className="flex justify-between items-center">
                              <span>{education}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">Resume Coverage</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>With Resumes</span>
                            <Badge className="bg-green-100 text-green-800">
                              {reportData.resumeStats?.totalWithResumes || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Without Resumes</span>
                            <Badge className="bg-red-100 text-red-800">
                              {reportData.resumeStats?.totalWithoutResumes || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Coverage Rate</span>
                            <Badge className="bg-blue-100 text-blue-800">
                              {reportData.summary?.resumeCoverageRate?.toFixed(1) || 0}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-3">Top Skills</h5>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(reportData.skillStats || {}).slice(0, 10).map(([skill, count]) => (
                            <div key={skill} className="flex justify-between items-center">
                              <span className="capitalize">{skill.toLowerCase()}</span>
                              <Badge variant="outline">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Table Preview */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Data Preview</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-3">
                      Showing first 5 records from the report. Download the CSV file for complete data.
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {filters.type === 'visitors' && reportData.visitors && (
                              <>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Phone</th>
                                <th className="text-left p-2">Village</th>
                                <th className="text-left p-2">Category</th>
                                <th className="text-left p-2">Visit Count</th>
                              </>
                            )}
                            {filters.type === 'appointments' && reportData.appointments && (
                              <>
                                <th className="text-left p-2">Title</th>
                                <th className="text-left p-2">Visitor</th>
                                <th className="text-left p-2">Date</th>
                                <th className="text-left p-2">Status</th>
                                <th className="text-left p-2">Priority</th>
                              </>
                            )}
                            {filters.type === 'youth' && reportData.youthVisitors && (
                              <>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Education</th>
                                <th className="text-left p-2">Skills</th>
                                <th className="text-left p-2">Has Resume</th>
                                <th className="text-left p-2">Visit Count</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {filters.type === 'visitors' && reportData.visitors && (
                            reportData.visitors.slice(0, 5).map((visitor: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{visitor.name}</td>
                                <td className="p-2">{visitor.phone}</td>
                                <td className="p-2">{visitor.village}</td>
                                <td className="p-2">{visitor.category}</td>
                                <td className="p-2">{visitor.visitCount}</td>
                              </tr>
                            ))
                          )}
                          {filters.type === 'appointments' && reportData.appointments && (
                            reportData.appointments.slice(0, 5).map((apt: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{apt.title}</td>
                                <td className="p-2">{apt.visitor?.name}</td>
                                <td className="p-2">{new Date(apt.scheduledDate).toLocaleDateString()}</td>
                                <td className="p-2">{apt.status}</td>
                                <td className="p-2">{apt.priority}</td>
                              </tr>
                            ))
                          )}
                          {filters.type === 'youth' && reportData.youthVisitors && (
                            reportData.youthVisitors.slice(0, 5).map((youth: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{youth.name}</td>
                                <td className="p-2">{youth.education || 'N/A'}</td>
                                <td className="p-2">{youth.skills ? JSON.parse(youth.skills).join(', ') : 'N/A'}</td>
                                <td className="p-2">{youth.resumes?.length > 0 ? 'Yes' : 'No'}</td>
                                <td className="p-2">{youth.visitCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Report Templates */}
        {!reportData && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Report Templates</CardTitle>
              <CardDescription>
                Commonly used report configurations for quick analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  onClick={() => {
                    const endDate = new Date().toISOString().split('T')[0];
                    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    setFilters(prev => ({ ...prev, type: 'visitors', startDate, endDate }));
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Weekly Visitors</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">Visitors registered in the last 7 days</p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  onClick={() => {
                    const endDate = new Date().toISOString().split('T')[0];
                    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    setFilters(prev => ({ ...prev, type: 'issues', startDate, endDate }));
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Monthly Issues</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">Issues logged in the last 30 days</p>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  onClick={() => {
                    const endDate = new Date().toISOString().split('T')[0];
                    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    setFilters(prev => ({ ...prev, type: 'youth', startDate, endDate }));
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5" />
                    <span className="font-medium">Youth Analytics</span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">Youth demographics and employment data</p>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}