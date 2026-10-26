import React, { useState } from 'react';
import { CollegeMember, CollegeRole, VehicleType } from '../../types';
import { CollegeRegistryService } from '../../services/CollegeRegistryService';
import { LicensePlate } from '../common/LicensePlate';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Building,
  Car,
  Bike,
  QrCode,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface CollegeRegistryViewProps {
  onOpenPassModal: (member: CollegeMember) => void;
  onRefreshRegistry?: () => void;
}

export const CollegeRegistryView: React.FC<CollegeRegistryViewProps> = ({
  onOpenPassModal,
}) => {
  const [members, setMembers] = useState<CollegeMember[]>(
    CollegeRegistryService.getAllMembers()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Member Form State
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<CollegeRole>('Student');
  const [newDept, setNewDept] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [newVehicleType, setNewVehicleType] = useState<VehicleType>('TWO_WHEELER');
  const [formError, setFormError] = useState('');

  const reloadMembers = () => {
    setMembers(CollegeRegistryService.getAllMembers());
  };

  const filteredMembers = members.filter((m) => {
    const matchesRole = selectedRole === 'ALL' || m.role === selectedRole;
    if (!matchesRole) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const matchesText =
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.registeredVehicles.some((v) =>
        v.vehicleNumber.toLowerCase().includes(q)
      );
    return matchesText;
  });

  const totalRegisteredVehicles = members.reduce(
    (acc, m) => acc + m.registeredVehicles.length,
    0
  );
  const twoWheelersCount = members.reduce(
    (acc, m) =>
      acc + m.registeredVehicles.filter((v) => v.vehicleType === 'TWO_WHEELER').length,
    0
  );
  const fourWheelersCount = totalRegisteredVehicles - twoWheelersCount;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim() || !newVehicleNumber.trim()) {
      setFormError('Member ID, Name, and Vehicle Number are required.');
      return;
    }

    const member: CollegeMember = {
      id: newId.trim().toUpperCase(),
      name: newName.trim(),
      role: newRole,
      department: newDept.trim() || 'General Studies',
      status: 'ACTIVE',
      passId: `PASS-${newId.trim().toUpperCase()}`,
      createdAt: new Date().toISOString(),
      registeredVehicles: [
        {
          vehicleNumber: newVehicleNumber.trim().toUpperCase(),
          vehicleType: newVehicleType,
          primary: true,
        },
      ],
    };

    CollegeRegistryService.saveMember(member);
    reloadMembers();
    setIsAddModalOpen(false);

    // Reset form
    setNewId('');
    setNewName('');
    setNewDept('');
    setNewVehicleNumber('');
    setFormError('');
  };

  const getRoleIcon = (role: CollegeRole) => {
    switch (role) {
      case 'Student':
        return <GraduationCap className="w-3.5 h-3.5 text-[#3F7D58]" />;
      case 'Faculty':
        return <Briefcase className="w-3.5 h-3.5 text-[#4F6B8A]" />;
      case 'Staff':
        return <ShieldCheck className="w-3.5 h-3.5 text-[#B7791F]" />;
      case 'Administration':
        return <Building className="w-3.5 h-3.5 text-[#6B7280]" />;
      default:
        return <Users className="w-3.5 h-3.5 text-[#6B7280]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="card-classic p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3F7D58]"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Verified Institutional Database
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#1F2937] tracking-tight">
            College Vehicle Registry
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Registered faculty, student, staff, and administration vehicles recognized by AI Camera.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary-muted px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Vehicle</span>
        </button>
      </div>

      {/* 2. Registry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-classic p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
            Total Members
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#1F2937]">
              {members.length}
            </span>
            <span className="text-xs text-[#2F6043] font-medium">Profiles</span>
          </div>
        </div>

        <div className="card-classic p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
            Registered Vehicles
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#3F7D58]">
              {totalRegisteredVehicles}
            </span>
            <span className="text-xs text-[#6B7280] font-medium">Authorized</span>
          </div>
        </div>

        <div className="card-classic p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
            Two-Wheelers
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#1F2937]">
              {twoWheelersCount}
            </span>
            <span className="text-xs text-[#6B7280] font-medium">Bikes / Scooters</span>
          </div>
        </div>

        <div className="card-classic p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
            Four-Wheelers
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#1F2937]">
              {fourWheelersCount}
            </span>
            <span className="text-xs text-[#6B7280] font-medium">Cars / SUVs</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card-classic p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member ID, name, dept, or plate..."
            className="input-clean w-full pl-10 pr-4 py-2 text-xs text-[#1F2937] placeholder:text-[#9CA3AF]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#9CA3AF] mr-1 shrink-0" />
          {['ALL', 'Student', 'Faculty', 'Staff', 'Administration'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                selectedRole === role
                  ? 'bg-[#E8F1EB] text-[#2F6043]'
                  : 'bg-[#F7F8FA] text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Members Registry Table */}
      <div className="card-classic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Member Info</th>
                <th className="py-3 px-4">Role & Dept</th>
                <th className="py-3 px-4">Registered Vehicle(s)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Digital Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9CA3AF] text-xs">
                    No registered members match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                    <tr
                    key={member.id}
                    className="group hover:bg-[#F1F7F3] transition-colors cursor-pointer"
                    onClick={() => onOpenPassModal(member)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#18231D] text-xs flex items-center gap-1.5">
                        <span>{member.name}</span>
                        <span className="text-[#3F7D58] opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#9CA3AF] mt-0.5">
                        {member.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#F7F9F8] border border-[#E4EAE6] font-medium text-[11px] text-[#18231D]">
                        {getRoleIcon(member.role)}
                        <span>{member.role}</span>
                      </div>
                      <div className="text-[11px] text-[#66736B] mt-1 truncate max-w-xs">
                        {member.department}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        {member.registeredVehicles.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <LicensePlate plateNumber={v.vehicleNumber} size="sm" />
                            <span className="text-[10px] text-[#66736B] flex items-center gap-1">
                              {v.vehicleType === 'TWO_WHEELER' ? (
                                <Bike className="w-3 h-3 text-[#3F7D58]" />
                              ) : (
                                <Car className="w-3 h-3 text-[#3F7D58]" />
                              )}
                              {v.vehicleType === 'TWO_WHEELER' ? '2W' : '4W'}
                              {v.primary && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#E8F2EB] text-[#285C3F] font-semibold">
                                  Primary
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-[#E8F2EB] text-[#285C3F]">
                        <CheckCircle2 className="w-3 h-3 text-[#3F7D58]" />
                        Active
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPassModal(member);
                        }}
                        className="btn-secondary-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs cursor-pointer hover:-translate-y-0.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#3F7D58]" />
                        <span>Pass</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add Member Dialog Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E7EB] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#3F7D58]" />
                <h3 className="font-bold text-sm text-[#1F2937]">
                  Register Campus Member Vehicle
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#9CA3AF] hover:text-[#1F2937] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B45353] font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                  Member ID
                </label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="e.g. STU-2024-999 or FAC-ME-301"
                  className="input-clean w-full px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Khanna"
                  className="input-clean w-full px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                    Campus Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as CollegeRole)}
                    className="input-clean w-full px-3 py-2 text-xs"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
                    <option value="Administration">Administration</option>
                    <option value="Authorized Personnel">Authorized Personnel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="e.g. Physics Dept"
                    className="input-clean w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newVehicleNumber}
                    onChange={(e) => setNewVehicleNumber(e.target.value)}
                    placeholder="e.g. KA-01-AB-1234"
                    className="input-clean w-full px-3 py-2 font-mono uppercase text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={newVehicleType}
                    onChange={(e) => setNewVehicleType(e.target.value as VehicleType)}
                    className="input-clean w-full px-3 py-2 text-xs"
                  >
                    <option value="TWO_WHEELER">Two-Wheeler (2W)</option>
                    <option value="FOUR_WHEELER">Four-Wheeler (4W)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary-white px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-muted px-4 py-2 rounded-xl text-xs font-medium cursor-pointer shadow-xs"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
