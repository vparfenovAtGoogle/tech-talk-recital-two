const os = require ('os')
const uuidv1 = require ('uuid/v1')

const queryProcessor = require ('../creojs/ptc-api-processor')

class ModelAuditRecord {
  constructor (model) {
    this.uuid = model.user.session.newId ()
    this.time = new Date ().toISOString ()
    this.model = model
  }
}

class FeatureChange extends ModelAuditRecord {
  constructor (model, featType, id, modType) {
    super (model)
    this.featType = featType
    this.modType = modType
    this.id = id
  }
  get downloadUri () {
    return `${this.model.user.session.imagesUri}/${this.imageUri}`
  }
  get imageFile () {
    return `${this.uuid}.jpg`
  }
  get imageUri () {
    return `${this.model.uri}/${this.imageFile}`
  }
  toJSON () {
    return {
      imageUri: this.imageUri,
      imageFile: this.imageFile,
      featType: this.featType,
      modType: this.modType,
      id: this.id,
      ctime: this.time
    }
  }
}

class ModelSubmission extends ModelAuditRecord  {
  constructor (model) {
    super (model)
    const changeCount = model.changes.length
    this.lastChange = changeCount - 1
    this.likes = {}
    if (changeCount > 0) model.changes [this.lastChange].submission = this
  }
  get fileName () {return this.uuid}
  like (username, like=true) {
    if (like) {
      this.likes [username] = username
    }
    else {
      this.unlike (username)
    }
  }
  unlike (username) {
    if (username in this.likes) delete this.likes [username]
  }
  get likeCount () {return Object.keys (this.likes).length}
  toJSON () {
    return {uuid: this.uuid, fileName: this.fileName, lastChange: this.lastChange, likes: this.likeCount}
  }
}

class Model {
  constructor (user, name) {
    this.name = name
    this.changes = []
    this.submissions = []
    this.user = user
  }
  addChange (featType, id, modType) {
    const change = new FeatureChange (this, featType, id, modType)
    this.changes.push (change)
    return change
  }
  listChanges () {
    return this.changes
  }
  addSubmission () {
    const submission = new ModelSubmission (this)
    this.submissions.push (submission)
    return submission
  }
  listSubmissions () {
    return this.submissions
  }
  getSubmission (uuid) {
    return this.submissions.find (s => s.uuid == uuid)
  }
  likeSubmission (uuid, user, like) {
    const subm = this.getSubmission (uuid)
    if (subm) {
      subm.like (user, like)
    }
  }
  get uri () {
    return `${this.user.uri}/${this.name}`
  }
  toJSON () {
    return {name: this.name, submissionCount: this.submissions.length, changeCount: this.changes.length, uri: this.uri}
  }
}

class User {
  constructor (session, username) {
    this.session = session
    this.username = username
    this.models = {}
  }
  get uri () {
    return this.username
  }
  listModels () {
    const user = this
    return Object.keys (user.models).map (name => user.models [name])
  }
  get modelCount () { return Object.keys (this.models).length}
  getModel (name) {
    if (!(name in this.models)) {
      this.models [name] = new Model (this, name)
    }
    return this.models [name]
  }
  toJSON () {
    return {username: this.username, modelCount: this.modelCount, uri: this.uri}
  }
}

class Session {
  constructor () {
    this.users = {}
    this.uuid = uuidv1 ()
    this.processor = queryProcessor (this)
    this.idCount = 0
  }
  newId () {
    const length = 6
    const value = this.idCount++
    const suffux = '0'.repeat (length) + value.toString(16)
    return `${this.uuid}-${suffux.slice (suffux.length-length)}`
  }
  getModel (username, modelname) {
    return this.getUser (username).getModel (modelname) 
  }
  addChange (username, modelname, featType, id, modType) {
    return this.getModel (username, modelname).addChange (featType, id, modType)
  }
  get userCount () { return Object.keys (this.users).length}
  get imagesDir () {return `public${this.imagesUri}`}
  get imagesUri () {return '/app/images'}
  get modelsUri () {return 'uploads/app/models'}
  getUser (username) {
    if (!(username in this.users)) {
      this.users [username] = new User (this, username)
    }
    return this.users [username]
  }
  listUsers () {
    const session = this
    return Object.keys (session.users).map (name => session.users [name])
  }
  executeQuery (query) {
    return this.processor.execute (query)
  }
  getEnv () {
    return process.env
  }
  getOS () {
    return {
      hostname: os.hostname(),
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus(),
      networkInterfaces: os.networkInterfaces()
    }
  }
  toJSON () {
    return {
      usersCount: this.usersCount,
      idCount: this.idCount,
      uuid: this.uuid,
      imagesUri: this.imagesDir,
      modelsUri: this.modelsUri
    }
  }
}

module.exports = function () {return new Session ()}
