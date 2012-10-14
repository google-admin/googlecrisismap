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

function EditPresenterTest() {
  cm.TestBase.call(this);
}
EditPresenterTest.prototype = new cm.TestBase();
registerTestSuite(EditPresenterTest);

/** Tests that the EditPresenter responds correctly to INSPECT events. */
EditPresenterTest.prototype.testInspectEvent = function() {
  var map = new cm.MapModel();
  var inspector = this.expectNew_('cm.InspectorView');
  var presenter = new cm.EditPresenter(null, map, null);

  // Emitting an INSPECT event on a map should open an inspector on the map.
  expectCall(inspector.inspect)(map, 'Edit map details', allOf([
    contains(recursivelyEquals(
        {key: 'title', label: 'Title', type: cm.editors.Type.TEXT})),
    contains(recursivelyEquals(
        {key: 'description', label: 'Description', type: cm.editors.Type.HTML,
         preview_class: 'cm-map-description'})),
    contains(recursivelyEquals(
        {key: 'viewport', label: 'Default viewport',
         type: cm.editors.Type.LAT_LON_BOX, app_state: null}))
  ]));
  cm.events.emit(goog.global, cm.events.INSPECT, {object: map});

  // Emitting an INSPECT event on a layer should open an inspector on the layer.
  var layer = new cm.LayerModel();
  expectCall(inspector.inspect)(layer, 'Edit layer details', allOf([
    contains(recursivelyEquals(
        {key: 'default_visibility', label: 'On in default view',
         type: cm.editors.Type.CHECKBOX})),
    contains(recursivelyEquals(
        {key: 'title', label: 'Title', type: cm.editors.Type.TEXT})),
    contains(recursivelyEquals(
        {key: 'description', label: 'Description', type: cm.editors.Type.HTML,
         preview_class: 'cm-layer-description'})),
    contains(recursivelyEquals(
        {key: 'legend', label: 'Legend', type: cm.editors.Type.HTML,
         preview_class: 'cm-layer-legend'})),
    contains(recursivelyEquals(
        {key: 'viewport', label: '"Zoom to area" viewport',
         type: cm.editors.Type.LAT_LON_BOX, app_state: null})),
    contains(recursivelyEquals(
        {key: 'min_zoom', type: cm.editors.Type.NUMBER, require_integer: true,
         label: 'Minimum zoom level', minimum: 0, maximum: 20})),
    contains(recursivelyEquals(
        {key: 'max_zoom', type: cm.editors.Type.NUMBER, require_integer: true,
         label: 'Maximum zoom level', minimum: 0, maximum: 20}))
  ]));
  cm.events.emit(goog.global, cm.events.INSPECT, {object: layer});
};

function findTypeEditorSpec(editorSpecs) {
  for (var i = 0; i < editorSpecs.length; i++) {
    if (editorSpecs[i].key === 'type') {
      return editorSpecs[i];
    }
  }
}

/** Tests that the opt_enableMapDataLayerType flag has the expected effect. */
EditPresenterTest.prototype.testEnableMapDataLayerType = function() {
  var MAP_DATA_CHOICE = {value: 'MAP_DATA', label: 'Maps Engine'};
  var layer = new cm.LayerModel();
  var inspector = this.expectNew_('cm.InspectorView');
  var specs;
  inspector.inspect = function(object, title, editorSpecs) {
    specs = editorSpecs;
  };

  // This should call inspector.inspect, which captures the 'editorSpecs' arg.
  var presenter = new cm.EditPresenter(null, null, null, {});
  cm.events.emit(goog.global, cm.events.INSPECT, {object: layer});
  // The MAP_DATA option should not be present.
  var spec = findTypeEditorSpec(specs);
  expectThat(spec.choices, not(contains(recursivelyEquals(MAP_DATA_CHOICE))));

  // Try again, this time with enable_map_data_layer_editing set.
  presenter = new cm.EditPresenter(null, null, null,
                                   {enable_map_data_layer_editing: true});
  cm.events.emit(goog.global, cm.events.INSPECT, {object: layer});
  // The MAP_DATA option should be present this time.
  spec = findTypeEditorSpec(specs);
  expectThat(spec.choices, contains(recursivelyEquals(MAP_DATA_CHOICE)));
};

/** Tests that the EditPresenter responds correctly to ARRANGE events. */
EditPresenterTest.prototype.testArrangerEvent = function() {
  var arranger = this.expectNew_('cm.ArrangeView',
      new FakeElement('div'), null, null, new cm.MapModel());
  var presenter = new cm.EditPresenter(null, null, arranger);

  // Emitting an ARRANGE event should open the layer arranger.
  expectCall(arranger.open)();
  cm.events.emit(goog.global, cm.events.ARRANGE, {});
};

/** Tests that the EditPresenter responds to CREATE_LAYER events. */
EditPresenterTest.prototype.testLayerCreatedEvent = function() {
  var presenter = new cm.EditPresenter(null, null, null);

  // Emitting a CREATE_LAYER event should create and execute a
  // CreateLayersCommand.
  var maproots = [{title: 'Empty Layer'}];
  var createLayersCommand = this.expectNew_('cm.CreateLayersCommand', maproots);
  expectCall(createLayersCommand.execute)(_, _);
  cm.events.emit(goog.global, cm.events.CREATE_LAYERS, {maproots: maproots});
};

/** Tests that the EditPresenter responds to DELETE_LAYER events. */
EditPresenterTest.prototype.testLayerDeletedEvent = function() {
  var presenter = new cm.EditPresenter(null, null, null);

  // Emitting a DELETE_LAYER event should create and execute an
  // DeleteLayerCommand.
  var id = 'new_layer_id';
  var deleteLayerCommand = this.expectNew_('cm.DeleteLayerCommand', id);
  expectCall(deleteLayerCommand.execute)(_, _);
  cm.events.emit(goog.global, cm.events.DELETE_LAYER, {id: id});
};

/** Tests that the EditPresenter responds correctly to OBJECT_EDITED events. */
EditPresenterTest.prototype.testObjectEditedEvent = function() {
  var inspector = this.expectNew_('cm.InspectorView');
  var presenter = new cm.EditPresenter(null, null, null);

  // Emitting an OBJECT_EDITED event should create and execute an EditCommand.
  var a = {x: 5}, b = {x: 6};
  var editCommand = this.expectNew_('cm.EditCommand', a, b, null);
  expectCall(editCommand.execute)(_, _);
  cm.events.emit(goog.global, cm.events.OBJECT_EDITED, {
    oldValues: a, newValues: b, layerId: null
  });
};

/** Tests that the EditPresenter responds to LAYERS_ARRANGED events. */
EditPresenterTest.prototype.testLayersArrangedEvent = function() {
  var presenter = new cm.EditPresenter(null, null, null);

  // Emitting a LAYERS_ARRANGED event should create and execute an
  // ArrangeCommand.
  var oldVal = new google.maps.MVCArray(['a', 'b', 'c']);
  var newVal = new google.maps.MVCArray(['c', 'b', 'a']);
  var arrangeCommand = this.expectNew_('cm.ArrangeCommand',
                                       oldVal, newVal);
  expectCall(arrangeCommand.execute)(_, _);
  cm.events.emit(goog.global, cm.events.LAYERS_ARRANGED, {
    oldValue: oldVal, newValue: newVal
  });
};

/** Tests that EditPresenter emits UNDO_REDO_BUFFER_CHANGED events correctly. */
EditPresenterTest.prototype.testCommandBufferChangedEvent = function() {
  var inspector = this.expectNew_('cm.InspectorView');
  var presenter = new cm.EditPresenter(null, null, null);
  var undoPossible, redoPossible;

  cm.events.listen(goog.global, cm.events.UNDO_REDO_BUFFER_CHANGED,
    function(e) {
      undoPossible = e.undo_possible;
      redoPossible = e.redo_possible;
    });

  var fakeCommand = {};
  fakeCommand.undo = function(a, b) { return true; };
  fakeCommand.execute = function(a, b) { return true; };

  // After a command is added to the buffer, there is a command to undo but
  // nothing to redo.
  presenter.doCommand(fakeCommand, {}, {});
  expectTrue(undoPossible);
  expectFalse(redoPossible);

  // After an undo operation, there is a command to redo but nothing to undo.
  cm.events.emit(goog.global, cm.events.UNDO);
  expectFalse(undoPossible);
  expectTrue(redoPossible);

  // After a redo operation, there is a command to undo but nothing to redo.
  cm.events.emit(goog.global, cm.events.REDO);
  expectTrue(undoPossible);
  expectFalse(redoPossible);
};

/** Tests that EditPresenter calls share on a SHARE_EMAIL event. */
EditPresenterTest.prototype.testShareEmailView = function() {
  var sharer = this.expectNew_('cm.ShareEmailView');
  var presenter = new cm.EditPresenter(null, null, null,
                                       {'save_url': 'bogus_url'});
  var url = false;
  sharer.share = function(save_url) { url = true; };

  // Emitting a SHARE_EMAIL event should open a share email popup.
  cm.events.emit(goog.global, cm.events.SHARE_EMAIL);
  expectTrue(url);
};