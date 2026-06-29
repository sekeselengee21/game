import { logger } from "../../utils/logger";
import React, { useEffect, useState } from "react";
import AdminDataBlock from "../../features/admin/admin-data-block";
import type { DataBlock } from "../../api/user";
import { FiPlus } from "react-icons/fi";
import { useCreateDataBlockMutation, useUpdateDataBlockMutation, useDeleteDataBlockMutation } from "../../api/admin";

function AdminDataPage() {
  const [modalType, setModalType] = useState<"create" | "edit" | "">("");
  const [editBlock, setEditBlock] = useState<DataBlock | undefined>();
  const [formValues, setFormValues] = useState({ name: "", value: "" });

  const [createDataBlock] = useCreateDataBlockMutation();
  const [updateDataBlock] = useUpdateDataBlockMutation();
  const [deleteDataBlock] = useDeleteDataBlockMutation();

  useEffect(() => {
    if (editBlock) {
      setFormValues({
        name: editBlock.name,
        value: editBlock.value,
      });
      setModalType("edit");
    } else {
      setFormValues({ name: "", value: "" });
    }
  }, [editBlock]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createDataBlock(formValues).unwrap();
      closeModal();
    } catch (error) {
      logger.error("Error creating block:", error);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateDataBlock({
        name: editBlock?.name ?? "",
        block: {
          name: editBlock?.name ?? "",
          value: formValues.value,
        },
      }).unwrap();
      closeModal();
    } catch (error) {
      logger.error("Error updating block:", error);
    }
  }

  async function handleDelete(name: string) {
    if (!window.confirm(`Delete data block "${name}"?`)) return;
    try {
      await deleteDataBlock(name).unwrap();
    } catch (err) {
      logger.error("Failed to delete:", err);
    }
  }

  function closeModal() {
    setModalType("");
    setEditBlock(undefined);
    setFormValues({ name: "", value: "" });
  }

  return (
    <div className="data-page-wrapper">
      <div className="data-page-container">
        {/* Modal */}
        {modalType !== "" && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{modalType === "create" ? "Create Data Block" : "Edit Data Block"}</h2>

              {modalType === "create" && (
                <form onSubmit={handleCreate}>
                  <label>
                    Name
                    <input type="text" name="name" placeholder="Нэрээ оруулна уу" value={formValues.name} onChange={handleInputChange} required />
                  </label>

                  <label>
                    Value
                    <input
                      type="text"
                      name="value"
                      placeholder="Мэдээллээ оруулна уу"
                      value={formValues.value}
                      onChange={handleInputChange}
                      required
                    />
                  </label>

                  <button type="submit">Create</button>
                </form>
              )}

              {modalType === "edit" && (
                <form onSubmit={handleUpdate}>
                  <label>
                    Name
                    <input
                      type="text"
                      name="name"
                      placeholder="Нэрээ оруулна уу"
                      value={formValues.name}
                      onChange={handleInputChange}
                      required
                      disabled
                    />
                  </label>

                  <label>
                    Value
                    <textarea
                      name="value"
                      placeholder="Мэдээллээ оруулна уу"
                      value={formValues.value}
                      onChange={handleInputChange}
                      rows={6}
                      required
                      className="value-textarea"
                    />
                  </label>

                  <button type="submit">Update</button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="create-button-container">
          <button
            onClick={() => {
              setModalType("create");
              setEditBlock(undefined);
            }}
            title="Create Data Block"
            aria-label="Create Data Block"
          >
            <FiPlus size={20} />
          </button>
        </div>

        <AdminDataBlock setEditBlock={setEditBlock} onDeleteBlock={handleDelete} />
      </div>
    </div>
  );
}

export default AdminDataPage;
