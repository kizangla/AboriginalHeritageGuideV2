import BusinessSearch from '@/components/BusinessSearch';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function BusinessSearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Indigenous Business Directory
            </h1>
            <p className="text-lg text-gray-600">
              Search the Australian Business Register for Indigenous-owned and operated businesses
            </p>
          </div>

          {/* Business Search Component */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <BusinessSearch />
          </div>

          {/* Information Section */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">About This Directory</h2>
            <div className="prose text-gray-600">
              <p>
                This business directory connects you with Indigenous-owned and operated businesses 
                across Australia. Data is sourced directly from the Australian Business Register (ABR) 
                to ensure accuracy and authenticity.
              </p>
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900">Search Tips:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Try keywords like "Indigenous", "Aboriginal", "Cultural", or "Traditional"</li>
                  <li>Search by business type such as "Art", "Tourism", or "Consulting"</li>
                  <li>Look for businesses with DGR (Deductible Gift Recipient) status</li>
                  <li>GST registration indicates established business operations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}