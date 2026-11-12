import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({
    body: req.body ?? {},
    query: req.query ?? {},
    params: req.params ?? {},
  });
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new ApiError(400, 'Please check the form and try again.', errors));
  }
  req.validated = parsed.data;
  next();
};
