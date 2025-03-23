const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    const { lectureId, posterUrl } = event
    
    try {
        await db.collection('lectures').doc(lectureId).update({
            data: {
                posterUrl: posterUrl,
                posterLink: '' // 清空原有的外部链接
            }
        })
        
        return {
            code: 0,
            message: 'success'
        }
    } catch (err) {
        console.error(err)
        return {
            code: -1,
            message: err.message
        }
    }
} 