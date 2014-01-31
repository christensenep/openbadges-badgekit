const fs = require('fs');
const path = require('path');
const Badge = require('../models/badge')("DATABASE");
const openbadger = require('../lib/openbadger');
const middleware = require('../middleware');

function getBadgeById(badgeId, callback) {
  // this is a gross way of distinguishing between local and openbadger-hosted badges.
  if (parseInt(badgeId)) {
      Badge.getOne({ id: badgeId }, { relationships: true }, function(err, row) {
       callback(err, { badge: row } );
     });
    }
    else {
      openbadger.getBadge({ slug: badgeId }, function(err, data) {
        if (err)
          return callback(err);

        data = openbadger.convertBadgeFormat(data);

        callback(err, { badge: data });
      });
    }
}

exports.home = function home (req, res, next) {
  const badgeId = req.params.badgeId;

  getBadgeById(badgeId, function(err, data) {
    if (err)
      return res.send(500, err);

    res.render('badge/home.html', data);
  });
};

exports.edit = function edit (req, res, next) {
  const badgeId = req.params.badgeId;
  const section = req.query.section || 'description';

  getBadgeById(badgeId, function(err, data) {
    if (err)
      return res.send(500, err);

    data.section = section;

    res.render('badge/edit.html', data);
  });
};

exports.save = function save (req, res, next) {
  const timeValue = parseInt(req.body.timeValue, 10);
  const limitNumber = parseInt(req.body.limitNumber, 10);
  const numCriteria = parseInt(req.body.numCriteria, 10);

  const query = { 
    id: req.body.badgeId, 
    name: req.body.name, 
    description: req.body.description, 
    tags: req.body.tags,
    issuerUrl: req.body.issuerUrl,
    earnerDescription: req.body.earnerDescription,
    consumerDescription: req.body.consumerDescription,
    rubricUrl: req.body.rubricUrl,
    timeValue: timeValue > 0 ? timeValue : 0,
    timeUnits: req.body.timeUnits,
    limit: req.body.limit == 'limit' ? (limitNumber > 0 ? limitNumber : 0) : 0,
    unique: req.body.unique == 'unique' ? 1 : 0,
    multiClaimCode: req.body.multiClaimCode,
  };

  Badge.put(query, function (err, result) {
    if (err)
      return res.send(500, err);

    Badge.getOne({ id: result.row.id }, function(err, row) {
      if (err)
        return res.send(500, err);

      const criteria = req.body.criteria.slice(0,numCriteria).map(function(criterion) {
        return {
          id: criterion.id || null,
          description: criterion.description,
          required: criterion.required == 'on' ? 1 : 0,
          note: criterion.note
        };
      });

      row.setCriteria(criteria, function(err) {
        if (err)
            return res.send(500, err);

        return middleware.redirect('badge', { badgeId: query.id }, 302)(req, res, next);
      });
    });
  });
};

exports.image = function image (req, res, next) {
  res.sendfile(path.join(__dirname, '../static/images/default-badge.png'));
};

exports.renderIssueByEmail = function renderIssueByEmail (req, res, next) {
  const badgeId = req.params.badgeId;

  openbadger.getBadge({ slug: badgeId }, function(err, data) {
    if (err)
      return res.send(500, err);

    data = openbadger.convertBadgeFormat(data);
    res.render('badge/issue-by-email.html', { badge: data });
  });
};

exports.issueByEmail = function issueByEmail (req, res, next) {
  const query = { 
    learner: {
      email: req.body.email
    },
    badge: req.body.badgeId
  };

  // This API endpoint isn't yet implemented, and likely "query" will have to be changed when it is
  openbadger.grantBadgeAward(req.body.badgeId, query, function(err, data) {
    //suppressing errors for now, as this will always result in an error at the moment
    //if (err)
    //  return res.send(500, err);

    return middleware.redirect('directory', 302)(req, res, next);
  });

};

exports.renderIssueByClaimCode = function renderIssueByClaimCode (req, res, next) {
  const badgeId = req.params.badgeId;

  openbadger.getBadge({ slug: badgeId }, function(err, data) {
    if (err)
      return res.send(500, err);

    data = openbadger.convertBadgeFormat(data);
    res.render('badge/issue-by-claim-code.html', { badge: data });
  });
};

exports.issueByClaimCode = function issueByClaimCode (req, res, next) {
  // openbadger does not yet support generation of claim codes via its API
  return middleware.redirect('directory', 302)(req, res, next);
};
