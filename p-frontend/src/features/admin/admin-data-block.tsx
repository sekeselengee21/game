import { useFetchDataBlocksQuery } from "../../api/admin";
import type { DataBlock } from "../../api/user";

interface AdminDataBlockProps {
  setEditBlock: (block: DataBlock) => void;
  onDeleteBlock: (name: string) => void;
}

function AdminDataBlock({ setEditBlock, onDeleteBlock }: AdminDataBlockProps) {
  const { data } = useFetchDataBlocksQuery();

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {data?.map((block) => (
            <tr key={block.name}>
              <td>{block.name}</td>
              <td className="value-cell">{block.value}</td>
              <td className="actions-cell">
                <button className="btn-text" onClick={() => setEditBlock(block)}>
                  Edit
                </button>
                <button className="btn-action btn-danger" onClick={() => onDeleteBlock(block.name)} style={{ marginLeft: "8px" }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {!data || data.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>
                No data blocks found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDataBlock;
