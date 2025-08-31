'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, EyeOff, Users, Shield, Building } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication data
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        router.push('/');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (email: string, password: string) => {
    setFormData({ email, password });
    // Auto-submit the form
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement;
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Information */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white text-xl font-bold">VM</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Visitor Management
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-8">
              Comprehensive constituency management system for MLAs and MPs
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Visitor Management</h3>
                <p className="text-gray-600">Smart registration, complete profiles, and visit tracking</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Issue Tracking</h3>
                <p className="text-gray-600">Log, track, and resolve constituent problems efficiently</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Analytics & Reports</h3>
                <p className="text-gray-600">Data-driven insights with comprehensive reporting</p>
              </div>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-start"
                onClick={() => handleDemoLogin('admin@example.com', 'password')}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium">Admin</span>
                  <Badge variant="outline" className="text-xs">Full Access</Badge>
                </div>
                <span className="text-xs text-gray-500">admin@example.com</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-start"
                onClick={() => handleDemoLogin('politician@example.com', 'password')}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium">Politician</span>
                  <Badge variant="outline" className="text-xs">Management</Badge>
                </div>
                <span className="text-xs text-gray-500">politician@example.com</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-start"
                onClick={() => handleDemoLogin('staff@example.com', 'password')}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium">Staff</span>
                  <Badge variant="outline" className="text-xs">Operations</Badge>
                </div>
                <span className="text-xs text-gray-500">staff@example.com</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-3 flex flex-col items-start"
                onClick={() => handleDemoLogin('staff2@example.com', 'password')}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium">Staff 2</span>
                  <Badge variant="outline" className="text-xs">Support</Badge>
                </div>
                <span className="text-xs text-gray-500">staff2@example.com</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Password: <code className="bg-gray-100 px-2 py-1 rounded">password</code>
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">VM</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600">
                Sign in to access your constituency dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Protected by role-based access control
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Built for effective constituency management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}