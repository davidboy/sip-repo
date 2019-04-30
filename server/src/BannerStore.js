const { ObjectID } = require('mongodb');

class BannerStore {
  constructor(db) {
    this.banners = db.collection('banners');
  }

  async create(message) {
    await this.banners.insertOne({ message });
  }

  get(id) {
    return this.banners.findOne({ _id: new ObjectID(id) });
  }

  getAll() {
    return this.banners.find({}).toArray();
  }

  getActive() {
    return this.banners.find({ active: true }).toArray();
  }

  async edit(id, message) {
    await this.banners.updateOne({ _id: new ObjectID(id) }, { $set: { message } });
  }

  async show(id) {
    await this.banners.updateOne({ _id: new ObjectID(id) }, { $set: { active: true } });
  }

  async hide(id) {
    await this.banners.updateOne({ _id: new ObjectID(id) }, { $set: { active: false } });
  }

  async delete(id) {
    await this.banners.deleteOne({ _id: new ObjectID(id) });
  }
}

module.exports = BannerStore;
