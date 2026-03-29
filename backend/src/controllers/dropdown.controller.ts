import { Response, NextFunction } from 'express';
import { DropdownConfig } from '../models/DropdownConfig.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response';

export const createDropdown = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { label, value, category, parentId, sortOrder } = req.body;

    const exists = await DropdownConfig.findOne({ category, value });
    if (exists) {
      sendError(res, 'Dropdown entry with this category and value already exists');
      return;
    }

    const dropdown = await DropdownConfig.create({ label, value, category, parentId: parentId || null, sortOrder });
    sendCreated(res, dropdown, 'Dropdown option created');
  } catch (err) {
    next(err);
  }
};

export const listDropdowns = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, parentId } = req.query;
    const filter: Record<string, unknown> = { isActive: true };

    if (category) filter.category = category;
    if (parentId === 'null' || parentId === '') {
      filter.parentId = null;
    } else if (parentId) {
      filter.parentId = parentId;
    }

    const dropdowns = await DropdownConfig.find(filter)
      .populate('parentId', 'label value')
      .sort({ sortOrder: 1, label: 1 });

    sendSuccess(res, dropdowns);
  } catch (err) {
    next(err);
  }
};

export const getDropdownTree = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category } = req.params;

    const all = await DropdownConfig.find({ category, isActive: true }).sort({ sortOrder: 1 });

    const map = new Map<string, unknown>();
    const roots: unknown[] = [];

    all.forEach((item) => {
      map.set(item._id.toString(), { ...item.toObject(), children: [] });
    });

    all.forEach((item) => {
      const node = map.get(item._id.toString()) as { children: unknown[] };
      if (item.parentId) {
        const parent = map.get(item.parentId.toString()) as { children: unknown[] } | undefined;
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    sendSuccess(res, roots, `Dropdown tree for category: ${category}`);
  } catch (err) {
    next(err);
  }
};

export const updateDropdown = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dropdown = await DropdownConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!dropdown) {
      sendNotFound(res, 'Dropdown option not found');
      return;
    }
    sendSuccess(res, dropdown, 'Dropdown updated');
  } catch (err) {
    next(err);
  }
};

export const deleteDropdown = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const childCount = await DropdownConfig.countDocuments({ parentId: req.params.id });
    if (childCount > 0) {
      sendError(res, 'Cannot delete: this option has child entries. Deactivate children first.');
      return;
    }

    const dropdown = await DropdownConfig.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!dropdown) {
      sendNotFound(res, 'Dropdown option not found');
      return;
    }
    sendSuccess(res, null, 'Dropdown option deactivated');
  } catch (err) {
    next(err);
  }
};

export const listCategories = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await DropdownConfig.distinct('category', { isActive: true });
    sendSuccess(res, categories, 'Categories retrieved');
  } catch (err) {
    next(err);
  }
};
