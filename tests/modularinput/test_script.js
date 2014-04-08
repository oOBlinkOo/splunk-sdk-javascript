
// Copyright 2014 Splunk, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"): you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

exports.setup = function() {

    var splunkjs        = require('../../index');
    var ET              = require("elementtree");
    var modularinput    = splunkjs.ModularInput;
    var Script          = modularinput.Script;
    var EventWriter     = modularinput.EventWriter;
    var Scheme          = modularinput.Scheme;
    var Argument        = modularinput.Argument;
    var utils           = modularinput.utils;

    splunkjs.Logger.setLevel("ALL");

    var TEST_SCRIPT_PATH = "__IGNORED_SCRIPT_PATH__";

    return {

        "Script tests": {
            setUp: function(done) {
                done();
            },

            "An error happens when a script has a null scheme": function(test) {
                // A script that returns a null scheme should generate no output on stdout
                // and an error on stderr saying that the scheme was null.

                var NewScript = new Script();
                
                NewScript.getScheme = function () {
                    return null;
                };
                NewScript.streamEvents = function () {
                    return; // not used
                };

                // TODO: make this work with streams
                var out = new Buffer(2048);
                var err = new Buffer(2048);
                var ew = new EventWriter(out, err);

                var inStream = new Buffer(2048);

                var args = [TEST_SCRIPT_PATH, "--scheme"];
                NewScript.runScript(args, ew, inStream, function(err, scriptStatus) {
                    test.ok(!err);

                    // TODO: figure out how to check that the out buffer is empty
                    //var output = ew._out.toString("utf-8");
                    var error = ew._err.toString("utf-8", 0, 51);

                    //test.strictEqual("", output);
                    test.strictEqual(error, "FATAL Modular input script returned a null scheme.\n");
                    test.strictEqual(1, scriptStatus);
                    test.done();
                });
            },

            "Script properly generates Scheme": function(test) {
                // Check that a scheme generated by a script is what we expect.

                var NewScript = new Script();

                NewScript.getScheme = function() {
                    var scheme = new Scheme("abcd");
                    scheme.description = "\uC3BC and \uC3B6 and <&> f\u00FCr";
                    scheme.streamingMode = Scheme.streamingModeSimple;
                    scheme.useExternalValidation = false;
                    scheme.useSingleInstance = true;

                    var arg1 = new Argument("arg1");
                    scheme.addArgument(arg1);

                    var arg2 = new Argument("arg2");
                    arg2.description = "\uC3BC and \uC3B6 and <&> f\u00FCr";
                    arg2.dataType = Argument.dataTypeNumber;
                    arg2.requiredOnCreate = true;
                    arg2.requiredOnEdit = true;
                    arg2.validation = "is_pos_int('some_name')";
                    scheme.addArgument(arg2);

                    return scheme;
                };
                NewScript.streamEvents = function() {
                    return; // Not used
                };

                // TODO: make this work with streams
                var out = new Buffer(2048);
                var err = new Buffer(2048);
                var ew = new EventWriter(out, err);

                var inStream = new Buffer(2048);

                var args = [TEST_SCRIPT_PATH, "--scheme"];
                NewScript.runScript(args, ew, inStream, function(err, scriptStatus) {
                    test.ok(!err);

                    var expected = utils.readFile(__filename, "../data/scheme_without_defaults.xml").toString();

                    // TODO: un-hardcode the 665 length for this test
                    var output = ew._out.toString("utf-8", 0, expected.length).substring(0, 665);

                    // TODO: figure out how to check that the err buffer is empty
                    //var error = ew._err.toString("utf-8", 0, 51);

                    test.ok(utils.XMLCompare(ET.parse(expected).getroot(), ET.parse(output).getroot()));
                    test.strictEqual(0, scriptStatus);
                    test.done();
                });
            },

            "Validation succeeds": function(test) {

                var NewScript = new Script();

                NewScript.getScheme = function() {
                    return null;
                };

                NewScript.validateInput = function(definition) {
                    return true; // Always succeed
                };

                NewScript.streamEvents = function() {
                    return; // not used
                };

                // TODO: make this work with streams
                var out = new Buffer(2048);
                var err = new Buffer(2048);
                var ew = new EventWriter(out, err);

                var args = [TEST_SCRIPT_PATH, "--validate-arguments"];

                var validationFile = utils.readFile(__filename, "../data/validation.xml").toString("utf-8");

                NewScript.runScript(args, ew, validationFile, function(err, scriptStatus) {
                    test.ok(!err);
                    // TODO: figure out how to check that these buffers are empty
                    //var output = ew._out.toString("utf-8");
                    //var error = ew._err.toString("utf-8", 0, 51);

                    //test.strictEqual("", output);
                    //test.strictEqual("", error);
                    test.strictEqual(0, scriptStatus);
                    test.done();
                });
            },

            "Validation fails": function(test) {

                var NewScript = new Script();

                NewScript.getScheme = function() {
                    return null;
                };

                NewScript.validateInput = function(definition) {
                    //return false; // TODO: failure
                    throw new Error("Big fat validation error!");
                };

                NewScript.streamEvents = function() {
                    return; // not used
                };

                // TODO: make this work with streams
                var out = new Buffer(2048);
                var err = new Buffer(2048);
                var ew = new EventWriter(out, err);

                var args = [TEST_SCRIPT_PATH, "--validate-arguments"];

                var validationFile = utils.readFile(__filename, "../data/validation.xml").toString("utf-8");

                NewScript.runScript(args, ew, validationFile, function(err, scriptStatus) {
                    test.ok(err);
                    // TODO: figure out how to check that the err buffer is empty
                    //var error = ew._err.toString("utf-8", 0, 51);

                    var expected = utils.readFile(__filename, "../data/validation_error.xml").toString("utf-8");
                    var output = ew._out.toString("utf-8", 0, expected.length);

                    test.ok(utils.XMLCompare(ET.parse(expected).getroot(), ET.parse(output).getroot()));
                    test.strictEqual(1, scriptStatus);
                    test.done();
                });
            },

            
        }
    };
};

if (module === require.main) {
    var splunkjs    = require('../../index');
    var test        = require('../../contrib/nodeunit/test_reporter');

    var suite = exports.setup();
    test.run([{"Tests": suite}]);
}