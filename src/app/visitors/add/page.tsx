'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Save, 
  Search, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  FileText,
  Upload
} from 'lucide-react';

interface VisitorFormData {
  name: string;
  phone: string;
  email: string;
  aadhaar: string;
  voterId: string;
  village: string;
  district: string;
  state: string;
  address: string;
  category: string;
  age: string;
  gender: string;
  occupation: string;
  education: string;
  skills: string;
  notes: string;
}

interface Visitor {
  id: string;
  name: string;
  phone: string;
  email: string;
  village: string;
  district: string;
  category: string;
  age: number;
  gender: string;
  occupation: string;
}

export default function AddVisitorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<VisitorFormData>({
    name: '',
    phone: '',
    email: '',
    aadhaar: '',
    voterId: '',
    village: '',
    district: '',
    state: 'Maharashtra',
    address: '',
    category: '',
    age: '',
    gender: '',
    occupation: '',
    education: '',
    skills: '',
    notes: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/visitors/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.visitors || []);
      } else {
        setError('Failed to search visitors');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Network error while searching');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Visitor registered successfully!');
        setFormData({
          name: '',
          phone: '',
          email: '',
          aadhaar: '',
          voterId: '',
          village: '',
          district: '',
          state: 'Maharashtra',
          address: '',
          category: '',
          age: '',
          gender: '',
          occupation: '',
          education: '',
          skills: '',
          notes: '',
        });
        setShowForm(false);
        setSearchResults([]);
        setSearchQuery('');
      } else {
        setError(data.error || 'Failed to register visitor');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVisitor = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setShowForm(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleNewVisitor = () => {
    setSelectedVisitor(null);
    setShowForm(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const getVisitorCategoryColor = (category: string) => {
    switch (category) {
      case 'FARMER': return 'bg-green-100 text-green-800';
      case 'STUDENT': return 'bg-blue-100 text-blue-800';
      case 'YOUTH': return 'bg-purple-100 text-purple-800';
      case 'WOMEN': return 'bg-pink-100 text-pink-800';
      case 'SENIOR_CITIZEN': return 'bg-gray-100 text-gray-800';
      case 'BUSINESSMAN': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
              <h1 className="text-xl font-semibold text-gray-900">Add Visitor</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Section */}
        {!showForm && !selectedVisitor && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Existing Visitor
              </CardTitle>
              <CardDescription>
                Search by name, phone, email, Aadhaar, or Voter ID to check if visitor already exists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, phone, email, Aadhaar, or Voter ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-12"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searching} className="h-12">
                  {searching ? 'Searching...' : 'Search'}
                </Button>
                <Button onClick={handleNewVisitor} variant="outline" className="h-12">
                  <UserPlus className="w-4 h-4 mr-2" />
                  New Visitor
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Found {searchResults.length} matching visitors:</h4>
                  {searchResults.map((visitor) => (
                    <div
                      key={visitor.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleSelectVisitor(visitor)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {visitor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{visitor.name}</h5>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {visitor.phone}
                            </span>
                            {visitor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {visitor.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {visitor.village}, {visitor.district}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={getVisitorCategoryColor(visitor.category)}>
                        {visitor.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">No visitors found matching "{searchQuery}"</p>
                  <Button onClick={handleNewVisitor}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register New Visitor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Visitor Details */}
        {selectedVisitor && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Visitor Found</CardTitle>
              <CardDescription>
                This visitor is already registered in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl font-medium">
                      {selectedVisitor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedVisitor.name}</h3>
                    <div className="flex items-center gap-4 text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedVisitor.phone}
                      </span>
                      {selectedVisitor.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {selectedVisitor.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Village</span>
                    <p className="font-medium">{selectedVisitor.village}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">District</span>
                    <p className="font-medium">{selectedVisitor.district}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Age</span>
                    <p className="font-medium">{selectedVisitor.age}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Category</span>
                    <Badge className={getVisitorCategoryColor(selectedVisitor.category)}>
                      {selectedVisitor.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => router.push(`/visitors/${selectedVisitor.id}`)}>
                  View Full Profile
                </Button>
                <Button onClick={() => router.push(`/appointments/schedule?visitorId=${selectedVisitor.id}`)} variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
                <Button onClick={handleNewVisitor} variant="outline">
                  Register Different Visitor
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Register New Visitor
              </CardTitle>
              <CardDescription>
                Enter the visitor's details to register them in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Enter full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        placeholder="Enter age"
                        value={formData.age}
                        onChange={handleInputChange}
                        min="1"
                        max="120"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="village">Village *</Label>
                      <Input
                        id="village"
                        name="village"
                        placeholder="Enter village name"
                        value={formData.village}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">District *</Label>
                      <Input
                        id="district"
                        name="district"
                        placeholder="Enter district name"
                        value={formData.district}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        placeholder="Enter state"
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Full Address</Label>
                      <Textarea
                        id="address"
                        name="address"
                        placeholder="Enter full address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Identification */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        name="aadhaar"
                        placeholder="Enter Aadhaar number"
                        value={formData.aadhaar}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voterId">Voter ID</Label>
                      <Input
                        id="voterId"
                        name="voterId"
                        placeholder="Enter Voter ID"
                        value={formData.voterId}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Category and Occupation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Category & Occupation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
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
                          <SelectItem value="TEACHER">Teacher</SelectItem>
                          <SelectItem value="HEALTH_WORKER">Health Worker</SelectItem>
                          <SelectItem value="GOVERNMENT_EMPLOYEE">Government Employee</SelectItem>
                          <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        name="occupation"
                        placeholder="Enter occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Education and Skills (for youth/students) */}
                {(formData.category === 'STUDENT' || formData.category === 'YOUTH' || formData.category === 'UNEMPLOYED') && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Education & Skills
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="education">Education Qualification</Label>
                        <Input
                          id="education"
                          name="education"
                          placeholder="e.g., 12th Pass, Graduate, Post Graduate"
                          value={formData.education}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Input
                          id="skills"
                          name="skills"
                          placeholder="e.g., Computer, Driving, Teaching"
                          value={formData.skills}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Any additional notes about the visitor..."
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registering...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Register Visitor
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}