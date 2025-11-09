import React from 'react';
import { ProgressBar } from 'recharts';

const OrderProgressTracker = ({ order, className = '' }) => {
  const { status, progressPercentage, createdAt, expectedDeliveryDate, actualDeliveryDate } = order;

  // Define progress steps
  const steps = [
    { key: 'pending', label: 'Order Placed', description: 'Waiting for seller to accept' },
    { key: 'accepted', label: 'Accepted', description: 'Seller has accepted your order' },
    { key: 'in-progress', label: 'In Progress', description: 'Work is being done' },
    { key: 'delivered', label: 'Delivered', description: 'Work has been delivered' },
    { key: 'completed', label: 'Completed', description: 'Order is complete' }
  ];

  // Get current step index
  const getCurrentStepIndex = () => {
    const stepIndex = steps.findIndex(step => step.key === status);
    return stepIndex >= 0 ? stepIndex : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'text-yellow-600 bg-yellow-100',
      'accepted': 'text-blue-600 bg-blue-100',
      'in-progress': 'text-purple-600 bg-purple-100',
      'delivered': 'text-orange-600 bg-orange-100',
      'completed': 'text-green-600 bg-green-100',
      'cancelled': 'text-red-600 bg-red-100',
      'disputed': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (actualDeliveryDate || status === 'completed') return null;
    
    const today = new Date();
    const deliveryDate = new Date(expectedDeliveryDate);
    const diffTime = deliveryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Order Progress</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm font-medium text-gray-900">{progressPercentage || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              status === 'completed' 
                ? 'bg-green-500' 
                : status === 'cancelled' || status === 'disputed'
                ? 'bg-red-500'
                : 'bg-primary-500'
            }`}
            style={{ width: `${progressPercentage || 0}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isSkipped = status === 'cancelled' || status === 'disputed';

          return (
            <div key={step.key} className="flex items-start">
              {/* Step Circle */}
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isCompleted && !isSkipped
                      ? 'bg-primary-500 border-primary-500'
                      : isCurrent && !isSkipped
                      ? 'bg-white border-primary-500'
                      : isSkipped
                      ? 'bg-gray-300 border-gray-300'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isCompleted && !isSkipped ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`text-sm font-medium ${
                        isCurrent && !isSkipped ? 'text-primary-500' : 'text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
              </div>

              {/* Step Content */}
              <div className="ml-4 flex-1 pb-4">
                <h4
                  className={`text-sm font-medium ${
                    isCompleted && !isSkipped
                      ? 'text-primary-600'
                      : isCurrent && !isSkipped
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </h4>
                <p className="mt-1 text-sm text-gray-500">{step.description}</p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute ml-4 mt-8 w-0.5 h-4 ${
                    isCompleted && !isSkipped ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                  style={{ transform: 'translateX(-50%)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline Info */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Order placed:</span>
          <span className="text-gray-900">{formatDate(createdAt)}</span>
        </div>
        
        {expectedDeliveryDate && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Expected delivery:</span>
            <span className="text-gray-900">{formatDate(expectedDeliveryDate)}</span>
          </div>
        )}

        {actualDeliveryDate && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Actual delivery:</span>
            <span className="text-gray-900">{formatDate(actualDeliveryDate)}</span>
          </div>
        )}

        {daysRemaining !== null && status !== 'completed' && status !== 'cancelled' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Days remaining:</span>
            <span
              className={`font-medium ${
                daysRemaining < 0
                  ? 'text-red-600'
                  : daysRemaining <= 2
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}
            >
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons Based on Status and User Role */}
      {order.userRole && (
        <div className="mt-4 pt-4 border-t">
          {status === 'pending' && order.userRole === 'seller' && (
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
              Accept Order
            </button>
          )}

          {status === 'accepted' && order.userRole === 'seller' && (
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Start Work
            </button>
          )}

          {status === 'in-progress' && order.userRole === 'seller' && (
            <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors">
              Deliver Order
            </button>
          )}

          {status === 'delivered' && order.userRole === 'buyer' && (
            <div className="space-y-2">
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                Accept & Complete
              </button>
              {order.revisionCount < order.maxRevisions && (
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors">
                  Request Revision
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderProgressTracker;