/**
 * Input Validation Schemas using Joi
 * Provides validation middleware for all API endpoints
 */
const Joi = require('joi');

// ============================================
// SCHEMA DEFINITIONS
// ============================================

const schemas = {
    // Asset schemas
    asset: Joi.object({
        id: Joi.string().uuid().optional(),
        name: Joi.string().min(1).max(200).required(),
        category: Joi.string().min(1).max(50).required(),
        ownerId: Joi.string().uuid().required(),
        purchaseAmount: Joi.number().min(0).default(0),
        purchaseDate: Joi.string().isoDate().default(() => new Date().toISOString()),
        currentValue: Joi.number().min(0).default(0),
        symbol: Joi.string().max(20).allow('', null).optional()
    }),

    assetUpdate: Joi.object({
        name: Joi.string().min(1).max(200).optional(),
        category: Joi.string().min(1).max(50).optional(),
        ownerId: Joi.string().uuid().optional(),
        symbol: Joi.string().max(20).allow('', null).optional()
    }),

    // Snapshot schemas
    snapshot: Joi.object({
        value: Joi.number().required(),
        date: Joi.string().isoDate().optional(),
        investmentChange: Joi.number().default(0),
        notes: Joi.string().max(1000).allow('', null).default('')
    }),

    snapshotUpdate: Joi.object({
        date: Joi.string().isoDate().required(),
        value: Joi.number().required(),
        investmentChange: Joi.number().default(0),
        notes: Joi.string().max(1000).allow('', null).default('')
    }),

    // Person schemas
    person: Joi.object({
        id: Joi.string().uuid().optional(),
        name: Joi.string().min(1).max(100).required()
    }),

    personUpdate: Joi.object({
        name: Joi.string().min(1).max(100).optional(),
        displayOrder: Joi.number().integer().min(0).optional()
    }),

    personReorder: Joi.object({
        ids: Joi.array().items(Joi.string().uuid()).required()
    }),

    // Category schemas
    category: Joi.object({
        label: Joi.string().min(1).max(50).required(),
        color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required()
            .messages({ 'string.pattern.base': 'Color must be a valid hex color (e.g., #FF5733)' })
    }),

    // Settings schemas - whitelist allowed keys
    setting: Joi.object({
        key: Joi.string().valid('currency', 'theme', 'defaultFilter', 'defaultDateRange').required(),
        value: Joi.string().max(50).required()
    }),

    // Auth schemas
    authSetup: Joi.object({
        password: Joi.string().min(4).max(100).required()
            .messages({ 'string.min': 'Password must be at least 4 characters' })
    }),

    authLogin: Joi.object({
        password: Joi.string().required()
    }),

    authChangePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(4).max(100).required()
            .messages({ 'string.min': 'New password must be at least 4 characters' })
    }),

    // ID parameter schema
    idParam: Joi.object({
        id: Joi.string().required()
    })
};

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Creates a validation middleware for the given schema
 * @param {string} schemaName - Name of the schema to validate against
 * @param {'body'|'params'|'query'} property - Request property to validate
 */
function validate(schemaName, property = 'body') {
    const schema = schemas[schemaName];
    if (!schema) {
        throw new Error(`Unknown schema: ${schemaName}`);
    }

    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const messages = error.details.map(d => d.message).join(', ');
            return res.status(400).json({ error: messages });
        }

        // Replace with validated and sanitized value
        req[property] = value;
        next();
    };
}

// ============================================
// PRE-BUILT VALIDATION MIDDLEWARES
// ============================================

module.exports = {
    schemas,
    validate,

    // Asset validations
    validateAsset: validate('asset'),
    validateAssetUpdate: validate('assetUpdate'),

    // Snapshot validations
    validateSnapshot: validate('snapshot'),
    validateSnapshotUpdate: validate('snapshotUpdate'),

    // Person validations
    validatePerson: validate('person'),
    validatePersonUpdate: validate('personUpdate'),
    validatePersonReorder: validate('personReorder'),

    // Category validations
    validateCategory: validate('category'),

    // Settings validations
    validateSetting: validate('setting'),

    // Auth validations
    validateAuthSetup: validate('authSetup'),
    validateAuthLogin: validate('authLogin'),
    validateAuthChangePassword: validate('authChangePassword'),

    // ID param validation
    validateIdParam: validate('idParam', 'params')
};
