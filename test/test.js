const assert = require("chai").assert;
const fs = require("fs");
const randomstring = require("randomstring");
const BuildVersion = require("../lib/version.js");

describe("BuildVersion", function() {
  describe("#validateOptions", function() {
  });

  describe("#readConfigFile", function() {
    it('missing config files cause null to be returned', function() {
      assert.isNull(BuildVersion.readConfigFile({config: "nonexistent.json"}));
    });

    it('config JSON is read when it exists', function() {
      var filename = randomstring.generate({length: 12, charset: 'alphabetic'});
      var value = randomstring.generate({length: 64});

      // write a random value to a temp file
      fs.writeFileSync(filename, JSON.stringify({"test": value}));
      var testConfig = BuildVersion.readConfigFile({config: filename});
      assert.isNotNull(testConfig);
      assert.equal(testConfig["test"], value);

      // clean up the temp file
      fs.unlinkSync(filename);
    });

    it('Non-JSON config isn\'t read - it is null', function() {
      var filename = randomstring.generate({length: 12, charset: 'alphabetic'});
      var value = randomstring.generate({length: 64});

      // write a random value to a temp file
      fs.writeFileSync(filename, value);
      assert.isNull(BuildVersion.readConfigFile({config: filename}));

      // clean up the temp file
      fs.unlinkSync(filename);
    });
  });

  describe("#saveVersionFile", function() {
    it('dry runs don\'t write files', function() {
      var filename = randomstring.generate({length: 12, charset: 'alphabetic'});
      var options = {dryrun: true, outputFile: filename};
      var testVersionInfo = {whatever: "something"};
      BuildVersion.saveVersionFile(options, testVersionInfo);
      assert.isFalse(fs.existsSync(filename));
    });

    /* WIP
    it('normal runs write to the output file', function() {
      var filename = randomstring.generate({length: 12, charset: 'alphabetic'});
      var value = randomstring.generate({length: 64});
      var options = {outputFile: filename};
      var testVersionInfo = {value: value};
      BuildVersion.saveVersionFile(options, testVersionInfo);
      assert.isTrue(fs.existsSync(filename));
      var content = JSON.parse(fs.readFileSync(filename));
      assert.isEqual(content['value'], value);
    });
    */
  });
});
