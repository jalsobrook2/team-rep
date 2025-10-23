const { body, param, query } = require('express-validator');

// Validation rules for user registration
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .trim(),
    
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .trim(),
    
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .trim(),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Must be a valid phone number'),
    
  body('role')
    .optional()
    .isIn(['worker', 'requester', 'both'])
    .withMessage('Role must be worker, requester, or both'),
    
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters')
    .trim(),
    
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
    
  body('skills.*')
    .optional()
    .isString()
    .withMessage('Each skill must be a string')
    .trim(),
    
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
    
  body('location.address')
    .optional()
    .isString()
    .trim(),
    
  body('location.city')
    .optional()
    .isString()
    .trim(),
    
  body('location.state')
    .optional()
    .isString()
    .trim(),
    
  body('location.zipCode')
    .optional()
    .isPostalCode('US')
    .withMessage('Invalid ZIP code'),
    
  body('location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
    
  body('location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
    
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Emergency contact must be an object'),
    
  body('emergencyContact.name')
    .optional()
    .isString()
    .trim(),
    
  body('emergencyContact.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Emergency contact phone must be valid'),
    
  body('emergencyContact.relationship')
    .optional()
    .isString()
    .trim()
];

// Validation rules for user login
const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for refresh token
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Validation rules for profile update
const validateProfileUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .trim(),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .trim(),
    
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .trim(),
    
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .trim(),
    
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Must be a valid phone number'),
    
  body('role')
    .optional()
    .isIn(['worker', 'requester', 'both'])
    .withMessage('Role must be worker, requester, or both'),
    
  body('bio')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters')
    .trim(),
    
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
    
  body('skills.*')
    .optional()
    .isString()
    .withMessage('Each skill must be a string')
    .trim(),
    
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
    
  body('availability')
    .optional()
    .isObject()
    .withMessage('Availability must be an object'),
    
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Emergency contact must be an object')
];

// Validation rules for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Validation rules for job creation
const validateJobCreation = [
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Job title must be between 1 and 100 characters')
    .trim(),
    
  body('description')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Job description must be between 1 and 1000 characters')
    .trim(),
    
  body('category')
    .isIn(['cleaning', 'handyman', 'tutoring', 'pet_care', 'landscaping', 'tech_help', 'moving', 'delivery', 'personal_care', 'event_help', 'other'])
    .withMessage('Invalid job category'),
    
  body('location')
    .isObject()
    .withMessage('Location is required and must be an object'),
    
  body('location.address')
    .notEmpty()
    .withMessage('Address is required')
    .trim(),
    
  body('location.city')
    .notEmpty()
    .withMessage('City is required')
    .trim(),
    
  body('location.state')
    .notEmpty()
    .withMessage('State is required')
    .trim(),
    
  body('location.zipCode')
    .isPostalCode('US')
    .withMessage('Valid ZIP code is required'),
    
  body('offer')
    .isFloat({ min: 1.00 })
    .withMessage('Offer must be at least $1.00'),
    
  body('estimatedDuration')
    .optional()
    .isInt({ min: 15 })
    .withMessage('Estimated duration must be at least 15 minutes'),
    
  body('skillsRequired')
    .optional()
    .isArray()
    .withMessage('Skills required must be an array'),
    
  body('equipmentProvided')
    .optional()
    .isBoolean()
    .withMessage('Equipment provided must be true or false'),
    
  body('safetyRequirements')
    .optional()
    .isArray()
    .withMessage('Safety requirements must be an array'),
    
  body('scheduledStart')
    .optional()
    .isISO8601()
    .withMessage('Scheduled start must be a valid date'),
    
  body('scheduledEnd')
    .optional()
    .isISO8601()
    .withMessage('Scheduled end must be a valid date')
];

// Validation rules for job update
const validateJobUpdate = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Job title must be between 1 and 100 characters')
    .trim(),
    
  body('description')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Job description must be between 1 and 1000 characters')
    .trim(),
    
  body('category')
    .optional()
    .isIn(['cleaning', 'handyman', 'tutoring', 'pet_care', 'landscaping', 'tech_help', 'moving', 'delivery', 'personal_care', 'event_help', 'other'])
    .withMessage('Invalid job category'),
    
  body('status')
    .optional()
    .isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid job status'),
    
  body('offer')
    .optional()
    .isFloat({ min: 1.00 })
    .withMessage('Offer must be at least $1.00'),
    
  body('rating')
    .optional()
    .isFloat({ min: 0.00, max: 5.00 })
    .withMessage('Rating must be between 0.00 and 5.00')
];

// Validation for UUID parameters
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`)
];

// Validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('sortBy')
    .optional()
    .isString()
    .trim(),
    
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateProfileUpdate,
  validatePasswordChange,
  validateJobCreation,
  validateJobUpdate,
  validateUUID,
  validatePagination
};