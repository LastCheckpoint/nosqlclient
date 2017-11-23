import { UIComponents, ExtendedJSON, Notification, ErrorHandler, SessionManager } from '/client/imports/modules';
import { Communicator } from '/client/imports/facades';

const FileManagement = function () {};

const JSONEditor = require('jsoneditor');

FileManagement.prototype = {
  keepUploading() {
    const contentType = $('#inputContentType').val();
    const blob = $('#inputFile')[0].files[0];
    let metaData = UIComponents.Editor.getCodeMirrorValue($('#divMetadata'));
    metaData = ExtendedJSON.convertAndCheckJSON(metaData);
    if (metaData.ERROR) {
      Notification.error(`Syntax error on metaData: ${metaData.ERROR}`);
      return;
    }

    const aliases = [];
    $('#selectAliases').find('option').each(function () {
      aliases.push($(this).val());
    });

    $('#fileInfoModal').modal('hide');
    this.proceedUploading(blob, contentType, metaData, aliases);
  },

  proceedUploading(blob, contentType, metaData, aliases) {
    Notification.start('#btnUpload');

    const fileReader = new FileReader();
    fileReader.onload = (file) => {
      Communicator.call({
        methodName: 'uploadFile',
        args: { bucketName: $('#txtBucketName').val(), blob: new Uint8Array(file.target.result), fileName: blob.name, contentType, metaData, aliases },
        callback: (err, result) => {
          if (err || result.error) ErrorHandler.showMeteorFuncError(err, result, "Couldn't upload file");
          else {
            Notification.success('Successfuly uploaded file');
            this.initFilesInformation();
          }
        }
      });
    };
    fileReader.readAsArrayBuffer(blob);
  },

  proceedShowingMetadata(id, jsonEditor) {
    Communicator.call({
      methodName: 'getFile',
      args: { bucketName: $('#txtBucketName').val(), fileId: id },
      callback: (err, result) => {
        if (err || result.error) ErrorHandler.showMeteorFuncError(err, result, "Couldn't find file");
        else jsonEditor.set(result.result);

        Notification.stop();
      }
    });
  },

  convertObjectIdAndDateToString(arr) {
    for (let i = 0; i < arr.length; i += 1) {
      if (arr[i]._id) arr[i]._id = arr[i]._id.$oid;
      if (arr[i].uploadDate) arr[i].uploadDate = arr[i].uploadDate.$date;
    }
  },

  initFilesInformation() {
    Notification.start('#btnReloadFiles');

    let selector = UIComponents.Editor.getCodeMirrorValue($('#divSelector'));
    selector = ExtendedJSON.convertAndCheckJSON(selector);
    if (selector.ERROR) {
      Notification.error(`Syntax error on selector: ${selector.ERROR}`);
      return;
    }

    Communicator.call({
      methodName: 'getFilesInfo',
      args: { selector, limit: $('#txtFileFetchLimit').val(), bucketName: $('#txtBucketName').val() },
      callback: (err, result) => {
        if (err || result.error) {
          ErrorHandler.showMeteorFuncError(err, result, "Couldn't get file informations");
          return;
        }
        this.convertObjectIdAndDateToString(result.result);
        UIComponents.DataTable.setupDatatable({
          selectorString: '#tblFiles',
          data: result.result,
          columns: [
            { data: '_id', width: '15%' },
            { data: 'filename', width: '20%' },
            { data: 'chunkSize', width: '15%' },
            { data: 'uploadDate', width: '15%' },
            { data: 'length', width: '15%' },
          ],
          columnDefs: [
            {
              targets: [5],
              data: null,
              width: '5%',
              defaultContent: '<a href="" title="Edit Metadata" class="editor_show_metadata"><i class="fa fa-book text-navy"></i></a>',
            },
            {
              targets: [6],
              data: null,
              width: '5%',
              defaultContent: '<a href="" title="Download" class="editor_download"><i class="fa fa-download text-navy"></i></a>',
            },
            {
              targets: [7],
              data: null,
              width: '5%',
              defaultContent: '<a href="" title="Delete" class="editor_delete"><i class="fa fa-remove text-navy"></i></a>',
            },
          ]
        });

        Notification.stop();
      }
    });
  },

  deleteFiles() {
    Notification.modal({
      title: 'Are you sure ?',
      text: 'All files that are matched by selector will be deleted, are you sure ?',
      type: 'warning',
      showCancelButton: true,
      cancelButtonText: 'No',
      callback: (isConfirm) => {
        if (isConfirm) {
          Notification.start('#btnDeleteFiles');

          let selector = UIComponents.Editor.getCodeMirrorValue($('#divSelector'));
          selector = ExtendedJSON.convertAndCheckJSON(selector);
          if (selector.ERROR) {
            Notification.error(`Syntax error on selector: ${selector.ERROR}`);
            return;
          }

          Communicator.call({
            methodName: 'deleteFiles',
            args: { bucketName: $('#txtBucketName').val(), selector },
            callback: (err, result) => {
              if (err || result.err) ErrorHandler.showMeteorFuncError(err, result, "Couldn't delete files");
              else {
                Notification.success('Successfuly deleted !');
                this.initFilesInformation();
              }
            }
          });
        }
      }
    });
  },

  delete() {
    const fileRow = SessionManager.get(SessionManager.strSessionSelectedFile);
    if (fileRow) {
      Notification.modal({
        title: 'Are you sure ?',
        text: 'You can NOT recover this file afterwards, are you sure ?',
        type: 'warning',
        cancelButtonText: 'No',
        callback: (isConfirm) => {
          if (isConfirm) {
            Notification.start('#btnReloadFiles');

            Communicator.call({
              methodName: 'deleteFile',
              args: { bucketName: $('#txtBucketName').val(), fileId: fileRow._id },
              callback: (err) => {
                if (err) Notification.error(`Couldn't delete: ${err.message}`);
                else {
                  Notification.success('Successfuly deleted !');
                  this.initFilesInformation();
                }
              }
            });
          }
        }
      });
    }
  },

  updateMetadata() {
    Notification.modal({
      title: 'Are you sure ?',
      text: 'Existing metadata will be overwritten, are you sure ?',
      type: 'warning',
      cancelButtonText: 'No',
      callback: (isConfirm) => {
        if (isConfirm) {
          Notification.start('#btnUpdateMetadata');
          const jsonEditor = $('#jsonEditorOfMetadata').data('jsoneditor');
          const setValue = jsonEditor.get();
          delete setValue._id;

          Communicator.call({
            methodName: 'updateOne',
            args: {
              selectedCollection: `${$('#txtBucketName').val()}.files`,
              selector: { _id: { $oid: SessionManager.get(SessionManager.strSessionSelectedFile)._id } },
              setObject: { $set: setValue }
            },
            callback: (err) => {
              if (err) Notification.error(`Couldn't update file info: ${err.message}`);
              else {
                Notification.success('Successfully updated file information !');
                this.proceedShowingMetadata(SessionManager.get(SessionManager.strSessionSelectedFile)._id, jsonEditor);
              }
            }
          });
        }
      }
    });
  },

  showMetadata() {
    Notification.start('#btnClose');

    const fileRow = SessionManager.get(SessionManager.strSessionSelectedFile);
    if (fileRow) {
      const editorDiv = $('#jsonEditorOfMetadata');
      let jsonEditor = editorDiv.data('jsoneditor');
      if (!jsonEditor) {
        jsonEditor = new JSONEditor(document.getElementById('jsonEditorOfMetadata'), {
          mode: 'tree',
          modes: ['code', 'form', 'text', 'tree', 'view'],
          search: true,
        });

        editorDiv.data('jsoneditor', jsonEditor);
      }

      $('#metaDataModal').modal('show');
      this.proceedShowingMetadata(fileRow._id, jsonEditor);
    }
  },

  download() {
    const fileRow = SessionManager.get(SessionManager.strSessionSelectedFile);
    if (fileRow) window.open(`download?fileId=${fileRow._id}&bucketName=${$('#txtBucketName').val()}&sessionId=${Meteor.default_connection._lastSessionId}`);
  }
};

export default new FileManagement();