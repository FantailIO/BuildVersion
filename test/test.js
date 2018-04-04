const assert = require("chai").assert;
const BuildVersion = require("../version.js").BuildVersion;

describe("BuildVersion", function() {
  describe("#validateOptions", function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1,2,3].indexOf(4), -1);
    });
  });

  describe("#readConfigFile", function() {
    it('missing config files cause null to be returned', function() {
      assert.isNull(BuildVersion.readConfigFile({"config": "nonexistent.json"}));
    });
  });
});
