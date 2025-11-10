import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { gigAPI } from '../services/api';
import Navbar from '../components/Navbar';
import GigCard from '../components/GigCard';

const Gigs = () => {
  const navigate = useNavigate();
  const { action, id } = useParams();
  const [searchParams] = useSearchParams();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    deliveryTime: '',
    tags: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchCategories();
    if (action === 'edit' && id) {
      fetchGigForEdit(id);
    } else if (action !== 'create') {
      fetchGigs();
    }
  }, [action, id]);

  const fetchCategories = async () => {
    const result = await gigAPI.getCategories();
    if (result.success) {
      setCategories(result.data.categories || []);
    }
  };

  const fetchGigs = async () => {
    setLoading(true);
    setError('');
    const result = await gigAPI.getAllGigs();
    
    if (result.success) {
      setGigs(result.data.gigs || []);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const fetchGigForEdit = async (gigId) => {
    setLoading(true);
    const result = await gigAPI.getGigById(gigId);
    
    if (result.success) {
      const gig = result.data.gig;
      setFormData({
        title: gig.title,
        description: gig.description,
        price: gig.price,
        category: gig.category,
        deliveryTime: gig.deliveryTime,
        tags: gig.tags?.join(', ') || ''
      });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const gigData = {
      ...formData,
      price: parseFloat(formData.price),
      deliveryTime: parseInt(formData.deliveryTime),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    let result;
    if (action === 'edit' && id) {
      result = await gigAPI.updateGig(id, gigData);
    } else {
      result = await gigAPI.createGig(gigData);
    }

    if (result.success) {
      navigate('/dashboard');
    } else {
      setFormError(result.error);
    }

    setFormLoading(false);
  };

  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = gig.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gig.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || gig.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Render Create/Edit Form
  if (action === 'create' || action === 'edit') {
    return (
      <>
        <Navbar />
        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            color: '#333'
          }}>
            {action === 'edit' ? 'Edit Gig' : 'Create New Gig'}
          </h1>

          {formError && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Gig Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                required
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="e.g., I will create a professional website"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                required
                maxLength={1000}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
                placeholder="Describe your gig in detail..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Price (USD) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleFormChange}
                  required
                  min="5"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="50.00"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  Delivery Time (days) *
                </label>
                <input
                  type="number"
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleFormChange}
                  required
                  min="1"
                  max="365"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="7"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleFormChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="e.g., react, javascript, responsive"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: formLoading ? '#ccc' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: formLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {formLoading ? 'Saving...' : (action === 'edit' ? 'Update Gig' : 'Create Gig')}
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }

  // Render Gigs List
  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333'
        }}>
          Browse Gigs
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Find the perfect freelancer for your project
        </p>

        {/* Search and Filter */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <input
            type="text"
            placeholder="Search gigs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: '#666' }}>
            Loading gigs...
          </div>
        ) : filteredGigs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            color: '#666'
          }}>
            <p style={{ fontSize: '1.1rem' }}>No gigs found matching your criteria.</p>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Showing {filteredGigs.length} gig{filteredGigs.length !== 1 ? 's' : ''}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {filteredGigs.map(gig => (
                <GigCard key={gig._id} gig={gig} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Gigs;
