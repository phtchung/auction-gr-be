const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'phamthanhchung2001@gmail.com',
        pass: 'azcxrcylruwtmhqu'
    }
})
const sendEmail = async ({email,randomCode, startTime, productName}) => {
    // send mail with defined transport object
    const info = await transporter.sendMail({
        from: 'phamthanhchung2001@gmail.com', // sender address
        to: email, // list of receivers
        subject: `Về việc đăng ký đấu giá sản phẩm ${productName} `, // Subject line
        text: `Đăng ký tham gia đấu giá sản phẩm ${productName}`, // plain text body
        html: `<section class="max-w-2xl px-6 py-8 mx-auto bg-white dark:bg-gray-900">
                <main class="mt-8">
                    <h2 class="text-gray-700 dark:text-gray-200">Xin chào ${email},</h2>
                    <p class="mt-2 leading-loose text-gray-600 dark:text-gray-300">
                        Chúc mừng bạn đã đăng ký tham gia thành công phiên đấu giá sản phẩm ${productName} của chúng tôi.
                    </p>
                    
                    <p class="mt-2 leading-loose text-gray-600 dark:text-gray-300">
                        Phiên đấu giá sẽ được bắt đầu vào lúc ${startTime} . Mã tham gia phiên đấu giá của bạn là : <strong>${randomCode}</strong>
                    </p>
<!--                    <button-->
<!--                        class="px-6 py-2 mt-4 text-sm font-medium tracking-wider text-white capitalize transition-colors duration-300 transform bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80">-->
<!--                        Accept the invite-->
<!--                    </button>-->
                    <p class="mt-8 text-gray-600 dark:text-gray-300">
                        Thanks, <br/>
                        PTC Auction Team
                    </p>
                </main>
            </section>
            `
    })
    console.log('Message sent: %s', info.messageId)
}
module.exports = sendEmail

