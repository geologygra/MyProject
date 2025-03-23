const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloudbase-3gr1mse212702fc0'
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { _id } = event
    return await db.collection('lectures').doc(_id).remove()
  } catch (err) {
    console.error(err)
    return err
  }
} 