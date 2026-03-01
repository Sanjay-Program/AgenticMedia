import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { isValidHexColor } from '@agenticmedia/shared-types';

export const brandingRouter = Router();
brandingRouter.use(authenticate);

const updateBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().refine(isValidHexColor, 'Invalid hex color').optional(),
  accentColor: z.string().refine(isValidHexColor, 'Invalid hex color').optional(),
  backgroundColor: z.string().refine(isValidHexColor, 'Invalid hex color').optional(),
  textColor: z.string().refine(isValidHexColor, 'Invalid hex color').optional(),
  fontFamily: z.string().min(1).max(255).optional(),
  companyName: z.string().min(1).max(255).optional(),
});

// Get current branding configuration
brandingRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT name, branding_config, custom_domain FROM organizations WHERE id = $1`,
      [req.user!.organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Organization not found');
    }

    const org = result.rows[0];
    res.json({
      branding: {
        companyName: org.name,
        customDomain: org.custom_domain,
        ...(org.branding_config || {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update branding configuration (admin only)
brandingRouter.patch(
  '/',
  authorize('admin'),
  validate(updateBrandingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyName, ...brandingFields } = req.body;

      // Merge with existing branding config
      const existingResult = await query(
        `SELECT branding_config FROM organizations WHERE id = $1`,
        [req.user!.organizationId]
      );

      const existingBranding = existingResult.rows[0]?.branding_config || {};
      const updatedBranding = { ...existingBranding, ...brandingFields };

      const updates: string[] = ['branding_config = $1'];
      const params: unknown[] = [JSON.stringify(updatedBranding)];
      let idx = 2;

      if (companyName) {
        updates.push(`name = $${idx++}`);
        params.push(companyName);
      }

      params.push(req.user!.organizationId);

      await query(
        `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${idx}`,
        params
      );

      res.json({
        branding: {
          companyName: companyName || existingResult.rows[0]?.name,
          ...updatedBranding,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Generate CSS variables from branding config (for white-label theming)
brandingRouter.get('/theme.css', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT branding_config FROM organizations WHERE id = $1`,
      [req.user!.organizationId]
    );

    const branding = result.rows[0]?.branding_config || {};
    const css = `:root {
  --primary-color: ${branding.primaryColor || '#6366F1'};
  --accent-color: ${branding.accentColor || '#8B5CF6'};
  --background-color: ${branding.backgroundColor || '#0F172A'};
  --text-color: ${branding.textColor || '#F8FAFC'};
  --font-family: ${branding.fontFamily || 'Inter, system-ui, sans-serif'};
}`;

    res.type('text/css').send(css);
  } catch (err) {
    next(err);
  }
});
