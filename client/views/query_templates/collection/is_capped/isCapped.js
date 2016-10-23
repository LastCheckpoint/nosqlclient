import {Template} from 'meteor/templating';
import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import Helper from '/client/helper';
import {initExecuteQuery} from '/client/views/pages/browse_collection/browse_collection';

/**
 * Created by RSercan on 3.1.2016.
 */
Template.isCapped.onRendered(function () {
    Helper.changeConvertOptionsVisibility(false);
});

Template.isCapped.executeQuery = function (historyParams) {
    initExecuteQuery();
    var selectedCollection = Session.get(Helper.strSessionSelectedCollection);

    Meteor.call("isCapped", selectedCollection, function (err, result) {
        if (!result.result) {
            result.result = false;
        }
        Helper.renderAfterQueryExecution(err, result, false, "isCapped", {}, (historyParams ? false : true));
    });
};