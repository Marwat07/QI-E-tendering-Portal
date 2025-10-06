const Joi = require('joi');

// User validation schemas
const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    company_name: Joi.string().max(255),
    phone: Joi.string().max(20),
    address: Joi.string().max(1000),
    role: Joi.string().valid('admin', 'buyer', 'vendor').default('vendor'),
    tax_number: Joi.string().max(50),
    registration_number: Joi.string().max(50),
    website: Joi.string().uri().max(255)
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    company_name: Joi.string().max(255),
    phone: Joi.string().max(20),
    address: Joi.string().max(1000),
    tax_number: Joi.string().max(50),
    registration_number: Joi.string().max(50),
    website: Joi.string().uri().max(255)
  }),
  
  adminUpdate: Joi.object({
    email: Joi.string().email(),
    company_name: Joi.string().max(255).allow(''),
    phone: Joi.string().max(20).allow(''),
    address: Joi.string().max(1000).allow(''),
    role: Joi.string().valid('admin', 'buyer', 'vendor'),
    is_active: Joi.boolean(),
    is_verified: Joi.boolean(),
    tax_number: Joi.string().max(50).allow(''),
    registration_number: Joi.string().max(50).allow(''),
    website: Joi.string().uri().max(255).allow('')
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

// Tender validation schemas
const tenderSchemas = {
  create: Joi.object({
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().min(10).required(),
    category_id: Joi.number().integer().positive().required(),
    budget_min: Joi.number().positive().precision(2),
    budget_max: Joi.number().positive().precision(2).min(Joi.ref('budget_min')),
    estimated_value: Joi.number().positive().precision(2),
    currency: Joi.string().length(3).uppercase().default('USD'),
    deadline: Joi.date().greater('now').required(),
    opening_date: Joi.date().default(() => new Date()),
    tender_type: Joi.string().valid('open', 'restricted', 'negotiated').default('open'),
    requirements: Joi.string().max(5000),
    terms_conditions: Joi.string().max(5000),
    payment_terms: Joi.string().max(1000),
    delivery_timeline: Joi.string().max(1000),
    evaluation_criteria: Joi.string().max(2000),
    location: Joi.string().max(255),
    contact_person: Joi.string().max(255),
    contact_email: Joi.string().email().max(255),
    contact_phone: Joi.string().max(20),
    documents: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      type: Joi.string().required(),
      size: Joi.number().integer().positive()
    })).default([])
  }),
  
  update: Joi.object({
    title: Joi.string().min(5).max(255),
    description: Joi.string().min(10),
    category_id: Joi.number().integer().positive(),
    budget_min: Joi.number().positive().precision(2),
    budget_max: Joi.number().positive().precision(2),
    estimated_value: Joi.number().positive().precision(2),
    currency: Joi.string().length(3).uppercase(),
    deadline: Joi.date().greater('now'),
    tender_type: Joi.string().valid('open', 'restricted', 'negotiated'),
    requirements: Joi.string().max(5000),
    terms_conditions: Joi.string().max(5000),
    payment_terms: Joi.string().max(1000),
    delivery_timeline: Joi.string().max(1000),
    evaluation_criteria: Joi.string().max(2000),
    location: Joi.string().max(255),
    contact_person: Joi.string().max(255),
    contact_email: Joi.string().email().max(255),
    contact_phone: Joi.string().max(20),
    status: Joi.string().valid('draft', 'open', 'closed', 'cancelled'),
    documents: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      type: Joi.string().required(),
      size: Joi.number().integer().positive()
    }))
  }),
  
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('draft', 'open', 'closed', 'cancelled', 'awarded'),
    category_id: Joi.number().integer().positive(),
    search: Joi.string().max(100),
    budget_min: Joi.number().positive(),
    budget_max: Joi.number().positive(),
    active_only: Joi.boolean().default(false),
    featured_only: Joi.boolean().default(false),
    created_by: Joi.number().integer().positive(),
    sort_by: Joi.string().valid('created_at', 'deadline', 'budget_max', 'title').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Bid validation schemas
const bidSchemas = {
  create: Joi.object({
    tender_id: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    proposal: Joi.string().min(50).max(5000).required(),
    technical_proposal: Joi.string().max(5000),
    commercial_proposal: Joi.string().max(5000),
    delivery_timeline: Joi.string().max(1000),
    warranty_terms: Joi.string().max(1000),
    attachments: Joi.alternatives().try(
      Joi.array().items(Joi.object({
        name: Joi.string().required(),
        filename: Joi.string(),
        size: Joi.number().integer().positive(),
        type: Joi.string(),
        path: Joi.string()
      })),
      Joi.string() // Allow JSON string from multipart form
    ).default([])
  }),
  
  update: Joi.object({
    amount: Joi.number().positive().precision(2),
    currency: Joi.string().length(3).uppercase(),
    proposal: Joi.string().min(50).max(5000),
    technical_proposal: Joi.string().max(5000),
    commercial_proposal: Joi.string().max(5000),
    delivery_timeline: Joi.string().max(1000),
    warranty_terms: Joi.string().max(1000),
    attachments: Joi.alternatives().try(
      Joi.array().items(Joi.object({
        name: Joi.string().required(),
        filename: Joi.string(),
        size: Joi.number().integer().positive(),
        type: Joi.string(),
        path: Joi.string()
      })),
      Joi.string() // Allow JSON string from multipart form
    )
  }),
  
  evaluate: Joi.object({
    status: Joi.string().valid('accepted', 'rejected').required(),
    evaluation_score: Joi.number().min(0).max(100).precision(2),
    evaluation_notes: Joi.string().max(2000),
    rejection_reason: Joi.string().max(1000),
    is_compliant: Joi.boolean(),
    compliance_notes: Joi.string().max(1000)
  }),
  
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    tender_id: Joi.number().integer().positive(),
    vendor_id: Joi.number().integer().positive(),
    status: Joi.string().valid('pending', 'accepted', 'rejected', 'withdrawn'),
    amount_min: Joi.number().positive(),
    amount_max: Joi.number().positive(),
    sort_by: Joi.string().valid('submitted_at', 'amount', 'evaluation_score').default('submitted_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// File upload validation
const fileUploadSchema = Joi.object({
  entity_type: Joi.string().valid('tender', 'bid', 'user').required(),
  entity_id: Joi.number().integer().positive().required(),
  is_public: Joi.boolean().default(false)
});

// Notification schemas
const notificationSchemas = {
  create: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    type: Joi.string().max(50).required(),
    title: Joi.string().max(255).required(),
    message: Joi.string().required(),
    data: Joi.object().default({})
  }),
  
  markAsRead: Joi.object({
    notification_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  })
};

// Common validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors
      });
    }
    
    req.query = value;
    next();
  };
};

// Params validation middleware
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    req.params = value;
    next();
  };
};

// Common parameter schemas
const paramSchemas = {
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  tenderId: Joi.object({
    tenderId: Joi.number().integer().positive().required()
  }),
  bidId: Joi.object({
    bidId: Joi.number().integer().positive().required()
  })
};

module.exports = {
  userSchemas,
  tenderSchemas,
  bidSchemas,
  fileUploadSchema,
  notificationSchemas,
  paramSchemas,
  validate,
  validateQuery,
  validateParams
};
