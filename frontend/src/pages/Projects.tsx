import { useEffect, useState, FormEvent } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Plus, Pencil, Trash2, Calendar, DollarSign, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../apiClient';
import { Project, Client } from '../types';
import Modal from '../components/Modal';

type Status = 'not_started' | 'in_progress' | 'completed';

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: 'not_started', label: 'Not Started', color: 'border-slate-600' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-500' },
  { id: 'completed', label: 'Completed', color: 'border-green-600' },
];

const emptyForm = {
  client_id: '',
  title: '',
  description: '',
  status: 'not_started' as Status,
  rate: '',
  rate_type: 'fixed' as 'fixed' | 'hourly',
  deadline: '',
};

function ProjectCard({
  project,
  onEdit,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
  isDragging = false,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: project.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, border: '1px solid var(--border)' }}
      className={`bg-gray-800 rounded-xl p-4 space-y-3 ${isDragging ? 'opacity-0' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          {...attributes}
          {...listeners}
          className="font-medium text-white text-sm cursor-grab active:cursor-grabbing leading-snug flex-1"
        >
          {project.title}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(project)}
            className="p-1 text-slate-500 hover:text-blue-400 rounded transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDeleteId(project.id)}
            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {project.client_name && (
        <p className="text-xs text-blue-400">{project.client_name}</p>
      )}

      {project.description && (
        <p className="text-xs text-slate-400 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-500">
        {project.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(project.deadline), 'dd MMM yyyy')}
          </div>
        )}
        {project.rate && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {project.rate}/{project.rate_type === 'hourly' ? 'hr' : 'fixed'}
          </div>
        )}
      </div>

      {confirmDeleteId === project.id && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-700">
          <span className="text-xs text-slate-400 flex-1">Delete this project?</span>
          <button
            onClick={() => onDelete(project.id)}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-slate-300 px-2 py-1 rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  projects,
  onEdit,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
  activeId,
}: {
  column: (typeof COLUMNS)[0];
  projects: Project[];
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex-1 min-w-[280px]">
      <div className={`border-t-2 ${column.color} rounded-t-none rounded-b-xl`}>
        <div className="bg-gray-900 rounded-b-xl" style={{ border: '1px solid var(--border)', borderTop: 'none' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold text-white">{column.label}</h2>
            <span className="text-xs bg-gray-800 text-slate-400 rounded-full px-2 py-0.5">
              {projects.length}
            </span>
          </div>
          <div
            ref={setNodeRef}
            className={`p-3 min-h-[200px] space-y-3 transition-colors rounded-b-xl ${
              isOver ? 'bg-blue-900/10' : ''
            }`}
          >
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={onEdit}
                onDelete={onDelete}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                isDragging={activeId === p.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    Promise.all([api.get('/projects'), api.get('/clients')])
      .then(([{ data: pd }, { data: cd }]) => {
        setProjects(pd.projects);
        setClients(cd.clients);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      client_id: project.client_id || '',
      title: project.title,
      description: project.description || '',
      status: project.status,
      rate: project.rate ? String(project.rate) : '',
      rate_type: project.rate_type || 'fixed',
      deadline: project.deadline ? project.deadline.split('T')[0] : '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, rate: form.rate ? Number(form.rate) : null };
    try {
      if (editing) {
        const { data } = await api.put(`/projects/${editing.id}`, payload);
        const updated = { ...data.project, client_name: clients.find((c) => c.id === data.project.client_id)?.name };
        setProjects((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
        toast.success('Project updated');
      } else {
        const { data } = await api.post('/projects', payload);
        const withClient = { ...data.project, client_name: clients.find((c) => c.id === data.project.client_id)?.name };
        setProjects((prev) => [withClient, ...prev]);
        toast.success('Project created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const projectId = String(active.id);
    const newStatus = String(over.id) as Status;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;

    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)));

    try {
      await api.put(`/projects/${projectId}`, { ...project, status: newStatus });
    } catch {
      toast.error('Failed to update status');
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p)));
    }
  }

  const byStatus = (status: Status) => projects.filter((p) => p.status === status);
  const activeProject = projects.find((p) => p.id === activeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Drag cards between columns to update status</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> New project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <FolderKanban className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">No projects yet.</p>
          <button onClick={openCreate} className="text-amber-400 hover:text-amber-300 text-sm">
            Create your first project →
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                projects={byStatus(col.id)}
                onEdit={openEdit}
                onDelete={handleDelete}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                activeId={activeId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeProject && (
              <div className="bg-gray-800 border border-blue-500 rounded-xl p-4 shadow-2xl opacity-95 w-72">
                <p className="font-medium text-white text-sm">{activeProject.title}</p>
                {activeProject.client_name && (
                  <p className="text-xs text-blue-400 mt-1">{activeProject.client_name}</p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Project' : 'New Project'}
          onClose={() => setModalOpen(false)}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="Website redesign"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client</label>
                <select
                  className="input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Project details..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Rate Type</label>
                <select
                  className="input"
                  value={form.rate_type}
                  onChange={(e) => setForm({ ...form, rate_type: e.target.value as 'fixed' | 'hourly' })}
                >
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div>
                <label className="label">Deadline</label>
                <input
                  type="date"
                  className="input"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : editing ? 'Save changes' : 'Create project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
