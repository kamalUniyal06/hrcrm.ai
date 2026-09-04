import { X, Calendar, User, FileText, AlertTriangle, Mail,Shield  } from 'lucide-react';

export function SpamDetailsPopup({ email, onClose }) {
  if (!email) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl text-gray-900">Spam Details</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date</h3>
              <p className="text-gray-900">{email.date_entered || "No date"}</p>
            </div>
          </div>

          {/* Sender */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
              <p className="text-gray-900">{email.name || "Unknown sender"}</p>
            </div>
          </div>

        

          {/* Spam Reason */}
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Spam Reason</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {email.description || "Suspicious content"}
                </p>
              </div>
            </div>
          </div>

          {/* Spam Status */}
          <div className="flex items-center gap-3">
            <div className="w-5 h-5"></div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                {email.spam || "SPAM"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}