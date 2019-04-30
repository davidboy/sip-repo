const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const BannerStore = require('./BannerStore');

const MONGO_URL = 'mongodb://localhost:27017';
const DATABASE_NAME = 'syncserver';

const app = express();
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

let syncServer = null;
app.registerSyncServer = (passedSyncServer) => {
  syncServer = passedSyncServer;
};

MongoClient.connect(MONGO_URL, { useNewUrlParser: true }, (err, client) => {
  if (err != null) {
    console.error('WARNING: could not connect to MongoDB.  The banner synchronization functionality will not function as expected.');

    return;
  }

  const db = client.db(DATABASE_NAME);
  const banners = new BannerStore(db);

  async function synchronizeBannerShown(shownBanner) {
    if (syncServer) {
      syncServer.broadcastRemoteAction({
        type: 'SYNC_BANNER_SHOWN',
        payload: shownBanner.message,
      });
    }
  }

  async function synchronizeBannerHidden(hiddenBanner) {
    if (syncServer) {
      syncServer.broadcastRemoteAction({
        type: 'SYNC_BANNER_HIDDEN',
        payload: hiddenBanner.message,
      });
    }
  }

  app.options('/api/banners', cors());
  app.get('/api/banners', cors(), async (req, res) => {
    res.json(await banners.getActive());
  });

  app.use(basicAuth({
    challenge: true,
    users: {
      'mattv@paragontruss.com': 'paragon',
    },
  }));

  app.get('/', async (req, res) => {
    res.render('index', { banners: await banners.getAll() });
  });

  app.get('/banners/create', (req, res) => {
    res.render('edit', {});
  });

  app.get('/banners/:id/show', async (req, res) => {
    await banners.show(req.params.id);
    await synchronizeBannerShown(await banners.get(req.params.id));

    res.redirect('/');
  });

  app.get('/banners/:id/hide', async (req, res) => {
    await banners.hide(req.params.id);
    await synchronizeBannerHidden(await banners.get(req.params.id));

    res.redirect('/');
  });

  app.get('/banners/:id/', async (req, res) => {
    res.render('edit', { banner: await banners.get(req.params.id) });
  });

  app.put('/banners/:id/', async (req, res) => {
    const oldBanner = await banners.get(req.params.id);
    await synchronizeBannerHidden(await banners.get(req.params.id));

    await banners.edit(req.params.id, req.body.message);

    if (oldBanner.active) {
      await synchronizeBannerShown(await banners.get(req.params.id));
    }

    res.redirect('/');
  });

  app.post('/banners/', async (req, res) => {
    await banners.create(req.body.message);
    res.redirect('/');
  });

  // TODO: making this a GET route is a CSRF vulnerability and should be fixed if/when the client
  //   gains the ability to make actual HTTP DELETE requests.
  app.get('/banners/:id/delete', async (req, res) => {
    const banner = await banners.get(req.params.id);
    if (banner.active) {
      await synchronizeBannerHidden(banner);
    }

    await banners.delete(req.params.id);
    res.redirect('/');
  });
});

module.exports = app;
