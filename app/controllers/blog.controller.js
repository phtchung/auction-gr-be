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

exports.getBlogDetail = async (req, res) => {
    try {
        const id = req.params.id
        const blog = await Blog.findById(id).select('_id content image title subtitle3 subtitle2 subtitle1 createdAt')

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found.' })
        }
        res.status(200).json(blog)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' })
    }
}
