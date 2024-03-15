const mongoose = require('mongoose')
const Blog = require('../models/blog.model')


exports.getBlogs = async (req, res) => {
    try {
        const  blogs = await Blog.find({})
        res.status(200).json(blogs)
    } catch (err) {
        return res.status(500).json({message: 'DATABASE_ERROR', err})
    }
}
