// Copyright 2012 Google Inc.  All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License.  You may obtain a copy
// of the License at: http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distrib-
// uted under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
// OR CONDITIONS OF ANY KIND, either express or implied.  See the License for
// specific language governing permissions and limitations under the License.

// Author: kpy@google.com (Ka-Ping Yee)

function InspectorViewTest() {
  cm.TestBase.call(this);
  this.view_ = new cm.InspectorView();

  // Listen for an OBJECT_EDITED event.
  this.objectEdited_ = false;
  this.oldValues_ = null;
  this.newValues_ = null;
  cm.events.listen(goog.global, cm.events.OBJECT_EDITED, function(e) {
    this.objectEdited_ = true;
    this.oldValues_ = e.oldValues;
    this.newValues_ = e.newValues;
  }, this);
}
InspectorViewTest.prototype = new cm.TestBase();
registerTestSuite(InspectorViewTest);

/**
 * Opens the inspector.
 * @private
 */
InspectorViewTest.prototype.openInspector_ = function() {
  // Grab the popup that the InspectorView will open.
  var me = this;
  this.setForTest_('cm.ui.showPopup', function(popup) {
    me.popup_ = popup;
  });

  // Open the inspector on a sample MVCObject.
  var object = new google.maps.MVCObject();
  object.setValues({a: 'x', b: 5});
  this.view_.inspect(object, 'Title text', [
    {key: 'a', label: 'First field', type: cm.editors.Type.TEXT},
    {key: 'b', label: 'Second field', type: cm.editors.Type.NUMBER,
     conditions: {'a': function(x) { return x == 'yes'; }}}
  ]);
};

/** Tests that the inspect() method works properly. */
InspectorViewTest.prototype.testInspect = function() {
  this.openInspector_();

  // Confirm that the popup has a title, a table, and two buttons.
  expectDescendantOf(this.popup_, 'h2');
  expectDescendantOf(this.popup_, 'table', withClass('cm-editors'));
  var buttonArea = expectDescendantOf(this.popup_, withClass('cm-button-area'));
  expectDescendantOf(buttonArea, 'button', withText('OK'));
  expectDescendantOf(buttonArea, 'button', withText('Cancel'));

  // Confirm that there are two properly labelled input fields.
  var rows = allDescendantsOf(this.popup_, isElement('tr'));
  expectEq(2, rows.length);
  expectDescendantOf(rows[0], 'label', withText('First field'));
  var aInput = expectDescendantOf(rows[0], 'input');
  expectEq('x', aInput.value);
  expectDescendantOf(rows[1], 'label', withText('Second field'));
  var bInput = expectDescendantOf(rows[1], 'input');
  expectEq('5', bInput.value);

  // Confirm that the 'b' field is initially hidden, since its condition
  // is not satisfied (property 'a' is not 'yes').
  expectEq('none', rows[1].style.display);
};

/**
 * Opens the inspector and then edits the first field in it.
 * @private
 */
InspectorViewTest.prototype.inspectAndEdit_ = function() {
  this.openInspector_();

  var rows = allDescendantsOf(this.popup_, isElement('tr'));
  expectEq(2, rows.length);
  var aInput = expectDescendantOf(rows[0], 'input');
  aInput.value = 'xnew';
  cm.events.emit(aInput, 'keyup');
};

/** Tests that clicking the OK button applies the user's edits. */
InspectorViewTest.prototype.testOk = function() {
  this.inspectAndEdit_();

  // Click the OK button.
  var button = expectDescendantOf(this.popup_, 'button', withText('OK'));
  cm.events.emit(button, 'click');

  // Confirm that the OBJECT_EDITED event was emitted with the right parameters.
  expectTrue(this.objectEdited_);
  expectEq('x', this.oldValues_['a']);
  expectEq('xnew', this.newValues_['a']);

  // Confirm that the popup disappeared.
  expectNoDescendantOf(cm.ui.document.body, this.popup_);
};

/** Tests that clicking the Cancel button discards the user's edits. */
InspectorViewTest.prototype.testCancel = function() {
  this.inspectAndEdit_();

  // Click the Cancel button.
  var button = expectDescendantOf(this.popup_, 'button', withText('Cancel'));
  cm.events.emit(button, 'click');

  // Confirm that the OBJECT_EDITED event was not emitted.
  expectFalse(this.objectEdited_);

  // Confirm that the popup disappeared.
  expectNoDescendantOf(cm.ui.document.body, this.popup_);
};

/** Tests a conditional editor under conditions when it should be hidden. */
InspectorViewTest.prototype.testConditionalHidden = function() {
  this.openInspector_();

  var rows = allDescendantsOf(this.popup_, isElement('tr'));
  expectEq(2, rows.length);
  var aInput = expectDescendantOf(rows[0], 'input');

  // The 'b' editor should be initially hidden, since the initial value
  // of property 'a' is 'x', not 'yes'.
  expectEq('none', rows[1].style.display);

  aInput.value = 'no';
  cm.events.emit(aInput, 'keyup');
  // Since 'no' fails the predicate, the 'b' editor should now be hidden.
  expectEq('none', rows[1].style.display);

  // Click the OK button.
  var button = expectDescendantOf(this.popup_, 'button', withText('OK'));
  cm.events.emit(button, 'click');

  // Confirm that an OBJECT_EDITED event was emitted with the right parameters.
  // The 'b' property should be undefined because its editor was disabled.
  expectTrue(this.objectEdited_);
  expectThat(this.oldValues_, recursivelyEquals({a: 'x', b: 5}));
  expectThat(this.newValues_, recursivelyEquals({a: 'no', b: undefined}));
};

/** Tests a conditional editor under conditions when it should be shown. */
InspectorViewTest.prototype.testConditionalShown = function() {
  this.openInspector_();

  var rows = allDescendantsOf(this.popup_, isElement('tr'));
  expectEq(2, rows.length);
  var aInput = expectDescendantOf(rows[0], 'input');
  var bInput = expectDescendantOf(rows[1], 'input');

  // The 'b' editor should be initially hidden, since the initial value
  // of property 'a' is 'x', not 'yes'.
  expectEq('none', rows[1].style.display);

  aInput.value = 'yes';
  cm.events.emit(aInput, 'keyup');
  // Since 'yes' satisfies the predicate, the 'b' editor should now be shown.
  expectEq('', rows[1].style.display);

  // Make a change in the 'b' editor.
  bInput.value = ' 6 ';
  cm.events.emit(bInput, 'keyup');

  // Click the OK button.
  var button = expectDescendantOf(this.popup_, 'button', withText('OK'));
  cm.events.emit(button, 'click');

  // Confirm that the OBJECT_EDITED event was emitted with the right parameters.
  // The 'b' property should be present because its editor was enabled.
  expectTrue(this.objectEdited_);
  expectThat(this.oldValues_, recursivelyEquals({a: 'x', b: 5}));
  expectThat(this.newValues_, recursivelyEquals({a: 'yes', b: 6}));
};

/** Tests that validation error messages are shown in the inspector. */
InspectorViewTest.prototype.testValidationErrorShown = function() {
  this.openInspector_();

  var rows = allDescendantsOf(this.popup_, isElement('tr'));
  var bInput = expectDescendantOf(rows[1], 'input');
  bInput.value = ' xxx ';  // invalid, should be a number
  cm.events.emit(bInput, 'keyup');

  expectDescendantOf(rows[1], withClass('cm-validation-error'),
                     withText('should be a number'));
};