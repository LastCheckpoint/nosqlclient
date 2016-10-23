import {Template} from 'meteor/templating';
import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import Helper from '/client/helper';
import {initExecuteQuery} from '/client/views/pages/browse_collection/browse_collection';

/**
 * Created by RSercan on 5.1.2016.
 */
Template.options.onRendered(function () {
    Helper.changeConvertOptionsVisibility(false);
});

Template.options.executeQuery = function (historyParams) {
    initExecuteQuery();
    var selectedCollection = Session.get(Helper.strSessionSelectedCollection);

    Meteor.call("options", selectedCollection, function (err, result) {
        Helper.renderAfterQueryExecution(err, result, false, "options", {}, (historyParams ? false : true));
    });
};