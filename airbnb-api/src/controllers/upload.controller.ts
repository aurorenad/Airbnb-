/// <reference types="express" />
/// <reference types="multer" />
import type { NextFunction, Response } from "express";
import prisma from "../config/prisma.js";
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl } from "../config/cloudinary.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

const parseId = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (req.userId !== id) {
      res.status(403).json({ message: "You can only update your own avatar" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Clean up old avatar
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId).catch((err) => 
        console.error("Failed to delete old avatar from Cloudinary:", err)
      );
    }

    const result = await uploadToCloudinary(req.file.buffer, "airbnb/avatars");
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        avatar: result.url,
        avatarPublicId: result.publicId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (req.userId !== id) {
      res.status(403).json({ message: "You can only delete your own avatar" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.avatarPublicId) {
      res.status(400).json({ message: "No avatar to remove" });
      return;
    }

    await deleteFromCloudinary(user.avatarPublicId);

    await prisma.user.update({
      where: { id },
      data: {
        avatar: null,
        avatarPublicId: null,
      },
    });

    res.json({ message: "Avatar deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const uploadListingPhotos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const listing = await prisma.listing.findUnique({ where: { id } });
    
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "Only the host can upload photos to this listing" });
      return;
    }

    const existingCount = await prisma.listingPhoto.count({ where: { listingId: id } });
    if (existingCount >= 5) {
      res.status(400).json({ message: "Maximum of 5 photos allowed per listing" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: "No files uploaded" });
      return;
    }

    const remainingSlots = 5 - existingCount;
    const filesToUpload = files.slice(0, remainingSlots);

    const uploadPromises = filesToUpload.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, "airbnb/listings");
      return prisma.listingPhoto.create({
        data: {
          url: result.url,
          publicId: result.publicId,
          listingId: id,
        },
      });
    });

    await Promise.all(uploadPromises);

    const updatedListing = await prisma.listing.findUnique({
      where: { id },
      include: { photos: true },
    });

    // Apply optimization to photo URLs
    if (updatedListing) {
      updatedListing.photos = updatedListing.photos.map(photo => ({
        ...photo,
        url: getOptimizedUrl(photo.url, 800, 600)
      }));
    }

    res.json(updatedListing);
  } catch (error) {
    next(error);
  }
};

export const deleteListingPhoto = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingId = parseId(req.params.id);
    const photoId = parseId(req.params.photoId);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "Only the host can delete photos from this listing" });
      return;
    }

    const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ message: "Photo not found" });
      return;
    }

    if (photo.listingId !== listingId) {
      res.status(403).json({ message: "Photo does not belong to this listing" });
      return;
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    res.json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
};
