require('module-alias/register')
import * as chai from 'chai'
import { jestSnapshotPlugin } from 'mocha-chai-jest-snapshot'

chai.use(jestSnapshotPlugin())
