import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { gigsAPI } from '../services/api';

const CreateGigForm = ({ onSuccess, onCancel }) => {
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      price: '',
      category: '',
      deliveryTime: '',
      tags: ''
    }
  });

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await gigsAPI.getCategories();
        setCategories(response.data.data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Watch price for real-time validation
  const watchedPrice = watch('price');

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Process tags - split by comma and clean up
      const processedTags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const gigData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        deliveryTime: parseInt(formData.deliveryTime),
        tags: processedTags
      };

      const response = await gigsAPI.create(gigData);

      if (response.data.success) {
        // Success! Reset form and call success callback
        reset();
        onSuccess && onSuccess(response.data.data);
      } else {
        setSubmitError(response.data.error || 'Failed to create gig');
      }
    } catch (error) {
      console.error('Create gig error:', error);
      
      if (error.response?.data?.details) {
        // Validation errors from backend
        setSubmitError(error.response.data.details.join(', '));
      } else if (error.response?.data?.error) {
        setSubmitError(error.response.data.error);
      } else {
        setSubmitError('Failed to create gig. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Gig</h2>
      
      {submitError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gig Title *
          </label>
          <input
            type="text"
            {...register('title', {
              required: 'Gig title is required',
              minLength: { value: 10, message: 'Title must be at least 10 characters' },
              maxLength: { value: 100, message: 'Title cannot exceed 100 characters' }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="I will create an amazing website for you"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            {...register('description', {
              required: 'Description is required',
              minLength: { value: 50, message: 'Description must be at least 50 characters' },
              maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
            })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe what you'll deliver, your experience, and why clients should choose you..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Price and Category Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="5"
              {...register('price', {
                required: 'Price is required',
                min: { value: 5, message: 'Minimum price is $5' },
                max: { value: 10000, message: 'Maximum price is $10,000' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="25.00"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
            )}
            {watchedPrice && !errors.price && (
              <p className="mt-1 text-sm text-green-600">
                You'll earn: ${(parseFloat(watchedPrice) * 0.8).toFixed(2)} (after 20% platform fee)
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              {...register('category', { required: 'Category is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Delivery Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Time (days) *
          </label>
          <input
            type="number"
            min="1"
            max="365"
            {...register('deliveryTime', {
              required: 'Delivery time is required',
              min: { value: 1, message: 'Minimum delivery time is 1 day' },
              max: { value: 365, message: 'Maximum delivery time is 365 days' }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="7"
          />
          {errors.deliveryTime && (
            <p className="mt-1 text-sm text-red-600">{errors.deliveryTime.message}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (optional)
          </label>
          <input
            type="text"
            {...register('tags')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="web design, responsive, modern (separate with commas)"
          />
          <p className="mt-1 text-sm text-gray-500">
            Add relevant tags to help clients find your gig
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Gig'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGigForm;