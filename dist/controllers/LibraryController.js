"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLibraryVideo = exports.getAllLibraryVideo = exports.getLibraryVideoById = exports.getLibraryVideo = exports.updateLibraryVideo = exports.uploadLibraryVideo = void 0;
const LibraryBook_1 = __importDefault(require("../models/LibraryBook"));
const cloudinary_1 = __importDefault(require("cloudinary"));
// 📌 Upload Library Video
const uploadLibraryVideo = (req, res) => {
    var _a, _b;
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return Promise.resolve();
    }
    const { title, author, subject, keywords, description } = req.body;
    const videoFile = req.files && ((_a = req.files.video) === null || _a === void 0 ? void 0 : _a[0]);
    const coverImageFile = req.files && ((_b = req.files.coverImage) === null || _b === void 0 ? void 0 : _b[0]);
    if (!videoFile || !coverImageFile) {
        res.status(400).json({ error: "Both video and cover image are required." });
        return Promise.resolve();
    }
    return Promise.all([
        cloudinary_1.default.v2.uploader.upload(videoFile.path, { resource_type: 'video', folder: 'library_videos' }),
        cloudinary_1.default.v2.uploader.upload(coverImageFile.path, { folder: 'library_books/covers' })
    ])
        .then(([videoResult, coverImageResult]) => {
        if (!videoResult.secure_url || !coverImageResult.secure_url) {
            throw new Error("File upload to Cloudinary failed");
        }
        const newVideo = new LibraryBook_1.default({
            title,
            author,
            subject,
            keywords: keywords ? keywords.split(',').map((k) => k.trim().toLowerCase()) : [],
            description,
            videoUrl: videoResult.secure_url,
            coverImage: coverImageResult.secure_url,
            uploadedBy: req.user.id,
            isApproved: true, // ✅ always approved
        });
        return newVideo.save();
    })
        .then((savedVideo) => {
        res.status(201).json({ message: "Video uploaded successfully!", video: savedVideo });
    })
        .catch((error) => {
        res.status(500).json({ error: "Internal server error", details: error });
    });
};
exports.uploadLibraryVideo = uploadLibraryVideo;
// ✅ Update Library Video
const updateLibraryVideo = (req, res) => {
    var _a, _b, _c;
    const { id } = req.params;
    const { title, author, subject, keywords, description } = req.body;
    const videoFile = req.files
        ? (Array.isArray(req.files)
            ? req.files.find(file => file.fieldname === 'video')
            : (_a = req.files['video']) === null || _a === void 0 ? void 0 : _a[0])
        : undefined;
    const coverImageFile = req.files
        ? (Array.isArray(req.files)
            ? req.files.find(file => file.fieldname === 'coverImage')
            : (_b = req.files['coverImage']) === null || _b === void 0 ? void 0 : _b[0])
        : undefined;
    const thumbnailFile = req.files
        ? (Array.isArray(req.files)
            ? req.files.find(file => file.fieldname === 'thumbnail')
            : (_c = req.files['thumbnail']) === null || _c === void 0 ? void 0 : _c[0])
        : undefined;
    return LibraryBook_1.default.findById(id)
        .then((video) => {
        if (!video)
            throw new Error('Library Video not found');
        const updateData = { title, author, subject, description };
        if (keywords) {
            updateData.keywords = keywords.split(',').map((k) => k.trim().toLowerCase());
        }
        return Promise.all([
            videoFile
                ? cloudinary_1.default.v2.uploader.upload(videoFile.path, {
                    resource_type: 'video',
                    folder: 'library_videos',
                    access_mode: 'public',
                })
                : null,
            coverImageFile
                ? cloudinary_1.default.v2.uploader.upload(coverImageFile.path, {
                    folder: 'library_books/covers',
                    access_mode: 'public',
                })
                : null,
            thumbnailFile
                ? cloudinary_1.default.v2.uploader.upload(thumbnailFile.path, {
                    folder: 'library_books/thumbnails',
                    access_mode: 'public',
                })
                : null,
        ]).then(([videoResult, imageResult, thumbnailResult]) => {
            if (videoResult)
                updateData.videoUrl = videoResult.secure_url;
            if (imageResult)
                updateData.coverImage = imageResult.secure_url;
            if (thumbnailResult)
                updateData.thumbnail = thumbnailResult.secure_url;
            return LibraryBook_1.default.findByIdAndUpdate(id, updateData, { new: true });
        });
    })
        .then((updatedVideo) => {
        res.json({ message: 'Library Video updated successfully', video: updatedVideo });
    })
        .catch((err) => {
        res.status(500).json({ error: err.message });
    });
    return Promise.resolve();
};
exports.updateLibraryVideo = updateLibraryVideo;
// ✅ Get All Library Videos (with filters)
// ✅ Get Books
const getLibraryVideo = (req, res) => {
    const { search, title, author, subject, keyword } = req.query;
    const conditions = [];
    if (search)
        conditions.push({ $text: { $search: search } });
    if (title)
        conditions.push({ title: new RegExp(title, 'i') });
    if (author)
        conditions.push({ author: new RegExp(author, 'i') });
    if (subject)
        conditions.push({ subject: new RegExp(subject, 'i') });
    if (keyword)
        conditions.push({ keywords: { $in: [keyword.toLowerCase()] } });
    const query = conditions.length > 0 ? { $and: conditions } : {};
    LibraryBook_1.default.find(query)
        .then((videos) => res.json({ videos, total: videos.length }))
        .catch((err) => res.status(500).json({ error: err.message }));
    return Promise.resolve();
};
exports.getLibraryVideo = getLibraryVideo;
// ✅ Get Single Video by ID
const getLibraryVideoById = (req, res) => {
    LibraryBook_1.default.findById(req.params.id)
        .then((video) => video ? res.json({ video }) : res.status(404).json({ message: 'Library Video not found' }))
        .catch((err) => res.status(500).json({ error: err.message }));
    return Promise.resolve();
};
exports.getLibraryVideoById = getLibraryVideoById;
// ✅ Get All Videos with Pagination
const getAllLibraryVideo = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    LibraryBook_1.default.find()
        .skip(skip)
        .limit(limit)
        .then((videos) => res.json({ videos, total: videos.length, page, limit }))
        .catch((err) => res.status(500).json({ error: err.message }));
    return Promise.resolve();
};
exports.getAllLibraryVideo = getAllLibraryVideo;
// ✅ Delete Library Video
const deleteLibraryVideo = (req, res) => {
    LibraryBook_1.default.findByIdAndDelete(req.params.id)
        .then((deletedVideo) => deletedVideo
        ? res.json({ message: 'Library Video deleted successfully' })
        : res.status(404).json({ message: 'Library Video not found' }))
        .catch((err) => res.status(500).json({ error: err.message }));
    return Promise.resolve();
};
exports.deleteLibraryVideo = deleteLibraryVideo;
