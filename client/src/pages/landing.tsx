import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Shield, TrendingUp, FileText } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-medical-teal rounded-lg flex items-center justify-center">
                <Mic className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-professional-grey">SpeechPath</h1>
                <p className="text-sm text-gray-500">Professional Speech Diagnosis Platform</p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-medical-teal hover:bg-medical-teal/90"
            >
              Sign In / Register
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-heading font-bold text-professional-grey mb-6">
              Advanced Speech Analysis for Healthcare Professionals
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Leverage AI-powered stuttering detection and comprehensive speech pattern analysis 
              to deliver precise diagnostic insights and professional reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/auth'}
                className="bg-medical-teal hover:bg-medical-teal/90"
              >
                Get Started - Sign In / Register
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-medical-teal text-medical-teal hover:bg-medical-teal hover:text-white"
              >
                Learn More
              </Button>
            </div>
            
            {/* Authentication Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-professional-grey">
                <strong>New users:</strong> Create your account with email and password.<br/>
                <strong>Password recovery:</strong> Use the "Forgot password" link if you need to reset your password.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-heading font-bold text-professional-grey mb-4">
              Comprehensive Speech Diagnosis Tools
            </h3>
            <p className="text-lg text-gray-600">
              Everything you need for professional speech therapy practice
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-medical-teal bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Mic className="text-medical-teal" size={24} />
                </div>
                <h4 className="text-lg font-semibold text-professional-grey mb-2">Audio Management</h4>
                <p className="text-gray-600 text-sm">
                  Record directly in-browser or upload audio files with professional-grade processing
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-trustworthy-blue bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="text-trustworthy-blue" size={24} />
                </div>
                <h4 className="text-lg font-semibold text-professional-grey mb-2">AI Analysis</h4>
                <p className="text-gray-600 text-sm">
                  Advanced stuttering detection with detailed speech pattern analysis and confidence metrics
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-health-green bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-health-green" size={24} />
                </div>
                <h4 className="text-lg font-semibold text-professional-grey mb-2">Clinical Reports</h4>
                <p className="text-gray-600 text-sm">
                  Generate professional diagnostic reports with PDF export and secure sharing
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-warm-orange bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-warm-orange" size={24} />
                </div>
                <h4 className="text-lg font-semibold text-professional-grey mb-2">HIPAA Compliant</h4>
                <p className="text-gray-600 text-sm">
                  Enterprise-grade security with healthcare compliance and patient data protection
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-medical-teal">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-heading font-bold text-white mb-4">
            Ready to Transform Your Speech Therapy Practice?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Join healthcare professionals who trust SpeechPath for accurate speech diagnosis and patient care.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/auth'}
            className="bg-white text-medical-teal hover:bg-gray-100"
          >
            Access Your Clinical Dashboard
          </Button>
        </div>
      </section>

      {/* Authentication Information Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-heading font-bold text-professional-grey text-center mb-8">
            Secure Access & Account Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-professional-grey mb-3">New Users - Simple Registration</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Create your professional account with just your email and a secure password. 
                  Our streamlined registration process gets you started quickly.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Email and password registration</li>
                  <li>• Secure professional authentication</li>
                  <li>• HIPAA-compliant data protection</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-professional-grey mb-3">Password Recovery & Security</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Forgot your password? Use our secure password recovery system to 
                  reset your password quickly and safely with email verification.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Email-based password reset</li>
                  <li>• Secure token verification</li>
                  <li>• Professional account management</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-professional-grey text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="h-8 w-8 bg-medical-teal rounded-lg flex items-center justify-center">
              <Mic className="text-white" size={16} />
            </div>
            <span className="text-lg font-heading font-semibold">SpeechPath</span>
          </div>
          <p className="text-gray-400">
            Professional Speech Diagnosis Platform for Healthcare Excellence
          </p>
        </div>
      </footer>
    </div>
  );
}
