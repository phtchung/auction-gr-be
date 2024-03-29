const {Storage} = require("@google-cloud/storage");
const {format} = require("util");
const Blog = require("../models/blog.model");
const {mongoose} = require("mongoose");
const sse = require("../sse");

exports.createBlog = async (req) => {
    let projectId = process.env.PROJECT_ID // Get this from Google Cloud
    let keyFilename = 'key.json'
    const storage = new Storage({
        projectId,
        keyFilename,
    });
    const bucket = storage.bucket(process.env.BUCKET_NAME); // Get this from Google Cloud -> Storage

    try {
        const adminId = req.userId
        if (!req.files || req.files.length === 0) {
            return res.status(500).send({message: "Please upload at least one file!"});
        }

        const uploadMainImagePromise = new Promise((resolve, reject) => {
            const blob = bucket.file('admin' + Date.now() + adminId + req.files['singlefile[]'][0].originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({url: publicUrl});
            });
            blobStream.end(req.files['singlefile[]'][0].buffer);
        });

        const rs = await uploadMainImagePromise;
        const main_image = rs.url

        const uploadMainImagePromise1 = new Promise((resolve, reject) => {
            const blob = bucket.file('admin' + Date.now() + adminId + req.files['singlefile_sub[]'][0].originalname);
            const blobStream = blob.createWriteStream({resumable: false});

            blobStream.on("error", (err) => {
                reject(err);
            });

            blobStream.on("finish", async () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                resolve({url: publicUrl});
            });
            blobStream.end(req.files['singlefile_sub[]'][0].buffer);
        });
        const rs1 = await uploadMainImagePromise1;
        const sub_image = rs1.url

        const blog = new Blog({
            author:new mongoose.Types.ObjectId(adminId),
            title: req.body?.title,
            content: req.body?.content,
            subtitle1:req.body?.subtitle1,
            subtitle2:req.body.subtitle2 ? req.body.subtitle2 : null,
            subtitle3:req.body.subtitle3 ? req.body.subtitle3 : null,
            sub_image: sub_image,
            image:main_image
        })
        await blog.save();
        return { data: [blog], error: false, message: "success", statusCode: 200 };

    } catch (err) {
        return {
            data: [],
            error: true,
            message: "Sorry an error occurred",
            statusCode: 500,
        };
    }
}
