import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, UserPlus, Users2, Settings, 
  LogOut, Plus, Search, Filter, MoreVertical, 
  School, MapPin, Phone, Mail, Upload, CheckCircle2,
  UserCheck, FileText, Bell, Building2, UserCircle,
  ArrowRight, ArrowLeft, ShieldCheck, Clock, X
} from 'lucide-react';

import './Dashboard.css';

const Dashboard = ({ theme }) => {
  // --- States ---
  const [onboardingStep, setOnboardingStep] = useState('choice'); // 'choice', 'create', 'join', 'pending', 'dashboard'
  const [activeTab, setActiveTab] = useState('overview');
  const [userRole, setUserRole] = useState('Admin'); // 'Admin' or 'Member'
  
  const [schoolData, setSchoolData] = useState({
    name: '',
    code: '',
    teacherCode: '',
    studentCode: '',
    managerCode: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    logo: null,
    contactPerson: '',
    email: '',
    phone: '',
    affiliation: ''
  });

  const [joinRequests, setJoinRequests] = useState([
    { id: 1, name: 'Alice Smith', role: 'Teacher', date: '2024-05-20', status: 'Pending' },
    { id: 2, name: 'Bob Wilson', role: 'Student', date: '2024-05-21', status: 'Pending' }
  ]);

  const [members, setMembers] = useState({
    teachers: [{ id: 101, name: 'Dr. Sarah Connor', subject: 'Physics', code: 'TCH-001' }],
    students: [{ id: 201, name: 'Charlie Brown', grade: '10th', code: 'STD-502' }],
    staff: [],
    managers: []
  });

  const navigate = useNavigate();

  // --- Handlers ---
  const handleCreateSchool = (data) => {
    const schoolId = Math.floor(1000 + Math.random() * 9000);
    setSchoolData({
      ...data,
      code: `SCH-${schoolId}`,
      teacherCode: `TCH-${schoolId}`,
      studentCode: `STD-${schoolId}`,
      managerCode: `MGR-${schoolId}`
    });
    setUserRole('Admin');
    setOnboardingStep('dashboard');
  };

  const handleJoinRequest = (code) => {
    // Detect role from prefix
    if (code.startsWith('TCH-')) setUserRole('Teacher');
    else if (code.startsWith('STD-')) setUserRole('Student');
    else if (code.startsWith('MGR-')) setUserRole('Manager');
    else setUserRole('Guest');
    
    setOnboardingStep('pending');
  };

  const approveRequest = (req) => {
    const type = req.role.toLowerCase() === 'teacher' ? 'teachers' : 'students';
    setMembers({
      ...members,
      [type]: [...members[type], { ...req, code: `${req.role === 'Teacher' ? 'TCH' : 'STD'}-${Math.floor(1000+Math.random()*9000)}` }]
    });
    setJoinRequests(joinRequests.filter(r => r.id !== req.id));
  };

  // --- Conditional Rendering ---
  return (
    <div className="dashboard-container">
      <AnimatePresence mode="wait">
        {onboardingStep === 'choice' && (
          <OnboardingChoice key="choice" onSelect={(choice) => setOnboardingStep(choice)} />
        )}
        
        {onboardingStep === 'create' && (
          <CreateSchoolForm 
            key="create" 
            onBack={() => setOnboardingStep('choice')} 
            onSubmit={handleCreateSchool} 
          />
        )}

        {onboardingStep === 'join' && (
          <JoinSchoolForm 
            key="join" 
            onBack={() => setOnboardingStep('choice')} 
            onSubmit={handleJoinRequest} 
          />
        )}

        {onboardingStep === 'pending' && (
          <PendingApproval key="pending" onCancel={() => setOnboardingStep('choice')} />
        )}

        {onboardingStep === 'dashboard' && (
          <motion.div 
            key="dashboard"
            className="dashboard-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              schoolName={schoolData.name} 
              role={userRole}
              onLogout={() => navigate('/')}
            />
            
            <main className="main-content">
              <Header activeTab={activeTab} />
              <div className="content-body">
                <ContentArea 
                  activeTab={activeTab} 
                  members={members} 
                  requests={joinRequests}
                  approveRequest={approveRequest}
                  schoolData={schoolData}
                  setSchoolData={setSchoolData}
                />
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-components ---

const OnboardingChoice = ({ onSelect }) => (
  <motion.div 
    className="choice-screen"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
  >
    <div className="choice-header">
      <h1>Welcome to TeamMate</h1>
      <p>Choose how you want to get started with your digital school management.</p>
    </div>
    
    <div className="choice-grid">
      <div className="choice-card admin" onClick={() => onSelect('create')}>
        <div className="choice-icon"><Building2 size={40} /></div>
        <h3>Create New School</h3>
        <p>Set up a fresh instance for your institution. You will be the Primary Admin.</p>
        <button className="choice-btn">Start Creation <ArrowRight size={18} /></button>
      </div>

      <div className="choice-card member" onClick={() => onSelect('join')}>
        <div className="choice-icon"><UserPlus size={40} /></div>
        <h3>Join Existing School</h3>
        <p>Already have a school code? Enter it to request access as a member.</p>
        <button className="choice-btn">Join School <ArrowRight size={18} /></button>
      </div>
    </div>
  </motion.div>
);

const CreateSchoolForm = ({ onBack, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: ''
  });

  return (
    <motion.div 
      className="form-screen"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="form-card compact">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <h2>Create Your School</h2>
        <p className="subtitle">Just enter your school's name to get started. All role-based codes will be generated automatically.</p>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
          <div className="form-group">
            <label>School Name</label>
            <input 
              type="text" 
              placeholder="e.g. Green Valley High" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          
          <p className="hint-text">Role-specific joining codes for Teachers, Students, and Managers will be available in your dashboard.</p>

          <button type="submit" className="submit-btn-full">Initialize School Portal</button>
        </form>
      </div>
    </motion.div>
  );
};

const JoinSchoolForm = ({ onBack, onSubmit }) => {
  const [code, setCode] = useState('');
  return (
    <motion.div className="form-screen" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="form-card compact">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <h2>Join Your Institution</h2>
        <p>Enter the unique code provided to you by your school administrator.</p>
        <div className="form-group">
          <label>Joining Code</label>
          <input 
            className="code-input-large"
            type="text" 
            placeholder="e.g. TCH-1234 or STD-5678" 
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <p className="hint-text">Your role (Teacher/Student/Staff) will be detected automatically from the code.</p>
        <button className="submit-btn-full" onClick={() => onSubmit(code)} disabled={!code}>Send Join Request</button>
      </div>
    </motion.div>
  );
};

const PendingApproval = ({ onCancel }) => (
  <motion.div className="form-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="pending-card">
      <div className="pending-icon"><Clock size={48} /></div>
      <h2>Request Sent!</h2>
      <p>Your request to join the school is currently pending approval from the administrator. We'll notify you once you're in.</p>
      <button className="secondary-btn" onClick={onCancel}>Cancel & Back</button>
    </div>
  </motion.div>
);

const Sidebar = ({ activeTab, setActiveTab, schoolName, role, onLogout }) => (
  <aside className="sidebar">
    <div className="sidebar-header">
      <div className="school-logo-mini"><Building2 size={22} /></div>
      <div className="school-meta">
        <h4>{schoolName}</h4>
        <span>{role}</span>
      </div>
    </div>

    <nav className="sidebar-nav">
      <NavItem id="overview" icon={<LayoutDashboard size={20} />} label="Overview" active={activeTab} set={setActiveTab} />
      <NavItem id="profile" icon={<School size={20} />} label="School Profile" active={activeTab} set={setActiveTab} />
      <div className="nav-group">MANAGEMENT</div>
      <NavItem id="teachers" icon={<Users size={20} />} label="Teachers" active={activeTab} set={setActiveTab} />
      <NavItem id="staff" icon={<UserCircle size={20} />} label="Staffs" active={activeTab} set={setActiveTab} />
      <NavItem id="students" icon={<Users2 size={20} />} label="Students" active={activeTab} set={setActiveTab} />
      <NavItem id="managers" icon={<ShieldCheck size={20} />} label="Managers" active={activeTab} set={setActiveTab} />
      <div className="nav-group">ACADEMICS</div>
      <NavItem id="groups" icon={<Plus size={20} />} label="Groups & Classes" active={activeTab} set={setActiveTab} />
      <NavItem id="documents" icon={<FileText size={20} />} label="Documents" active={activeTab} set={setActiveTab} />
      <div className="nav-group">SYSTEM</div>
      <NavItem id="invites" icon={<Bell size={20} />} label="Invites & Approvals" active={activeTab} set={setActiveTab} />
      <NavItem id="settings" icon={<Settings size={20} />} label="Settings" active={activeTab} set={setActiveTab} />
    </nav>

    <button className="logout-action" onClick={onLogout}>
      <LogOut size={20} /> Sign Out
    </button>
  </aside>
);

const NavItem = ({ id, icon, label, active, set }) => (
  <button className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => set(id)}>
    {icon} {label}
  </button>
);

const Header = ({ activeTab }) => (
  <header className="main-header">
    <div className="breadcrumb">
      <span>Dashboard</span> / <span className="active">{activeTab}</span>
    </div>
    <div className="header-actions">
      <div className="notif-bell"><Bell size={20} /></div>
      <div className="user-pill">
        <div className="user-avatar">JD</div>
        <span>John Doe</span>
      </div>
    </div>
  </header>
);

const ContentArea = ({ activeTab, members, requests, approveRequest, schoolData, setSchoolData }) => {
  switch(activeTab) {
    case 'overview': return <OverviewDashboard members={members} />;
    case 'profile': return <SchoolProfile data={schoolData} setData={setSchoolData} />;
    case 'teachers': return <PeopleTable title="Teachers" data={members.teachers} />;
    case 'students': return <PeopleTable title="Students" data={members.students} />;
    case 'invites': return <InvitesModule requests={requests} onApprove={approveRequest} />;
    case 'groups': return <GroupsModule />;
    case 'documents': return <NotionPlaceholder />;
    default: return <div className="placeholder-view">Section "{activeTab}" is under development.</div>;
  }
};

// --- View Modules ---

const OverviewDashboard = ({ members }) => (
  <div className="overview-container">
    <div className="stats-row">
      <StatCard label="Teachers" count={members.teachers.length} color="blue" />
      <StatCard label="Students" count={members.students.length} color="green" />
      <StatCard label="Pending Invites" count={2} color="orange" />
    </div>
    <div className="welcome-banner">
      <h2>Welcome back, Admin!</h2>
      <p>Everything is running smoothly. You have 2 new join requests to review.</p>
    </div>
  </div>
);

const StatCard = ({ label, count, color }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-value">{count}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const SchoolProfile = ({ data, setData }) => (
  <div className="profile-container">
    <div className="profile-card">
      <div className="profile-header-edit">
        <div className="logo-upload-big">
          <Upload size={32} />
          <span>Upload Logo</span>
        </div>
        <div className="profile-title">
          <input 
            className="edit-h1" 
            value={data.name} 
            onChange={e => setData({...data, name: e.target.value})} 
            placeholder="School Name"
          />
          <span className="code-tag">CODE: {data.code}</span>
        </div>
      </div>
      
      <div className="profile-sections-edit">
        <div className="profile-section-block">
          <h4>Role-Based Joining Codes</h4>
          <p className="section-hint">Share these codes with users so they can request to join your institution.</p>
          <div className="form-grid">
            <div className="code-display-box">
              <label>Teacher Code</label>
              <div className="code-value">{data.teacherCode}</div>
            </div>
            <div className="code-display-box">
              <label>Student Code</label>
              <div className="code-value">{data.studentCode}</div>
            </div>
            <div className="code-display-box">
              <label>Manager Code</label>
              <div className="code-value">{data.managerCode}</div>
            </div>
          </div>
        </div>

        <div className="profile-section-block">
          <h4>Institution Details</h4>
          <div className="form-grid">
            <div className="detail-item-edit">
              <label>Affiliation Number</label>
              <input type="text" value={data.affiliation} onChange={e => setData({...data, affiliation: e.target.value})} placeholder="e.g. CBSE/12345" />
            </div>
            <div className="detail-item-edit">
              <label>Contact Person</label>
              <input type="text" value={data.contactPerson} onChange={e => setData({...data, contactPerson: e.target.value})} placeholder="Name of Admin/Principal" />
            </div>
            <div className="detail-item-edit">
              <label>Phone Number</label>
              <input type="tel" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="detail-item-edit">
              <label>School Email</label>
              <input type="email" value={data.email} onChange={e => setData({...data, email: e.target.value})} placeholder="contact@school.com" />
            </div>
          </div>
        </div>

        <div className="profile-section-block">
          <h4>Location Information</h4>
          <div className="form-group-edit">
            <label>Full Address</label>
            <textarea value={data.address} onChange={e => setData({...data, address: e.target.value})} placeholder="Street, Area, etc." rows="2"></textarea>
          </div>
          <div className="form-grid">
            <div className="detail-item-edit">
              <label>City</label>
              <input type="text" value={data.city} onChange={e => setData({...data, city: e.target.value})} placeholder="City" />
            </div>
            <div className="detail-item-edit">
              <label>State</label>
              <input type="text" value={data.state} onChange={e => setData({...data, state: e.target.value})} placeholder="State" />
            </div>
            <div className="detail-item-edit">
              <label>Pincode</label>
              <input type="text" value={data.pincode} onChange={e => setData({...data, pincode: e.target.value})} placeholder="Zip Code" />
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button className="save-btn" onClick={() => alert('Profile updated successfully!')}>Save Changes</button>
      </div>
    </div>
  </div>
);

const PeopleTable = ({ title, data }) => (
  <div className="data-table-container">
    <div className="table-header">
      <h3>{title} Directory</h3>
      <button className="add-btn"><Plus size={18} /> Add {title.slice(0, -1)}</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Unique Code</th>
          <th>Class/Subject</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td><code className="table-code">{item.code}</code></td>
            <td>{item.grade || item.subject}</td>
            <td><span className="dot active"></span> Active</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const InvitesModule = ({ requests, onApprove }) => (
  <div className="invites-container">
    <h3>Pending Join Requests</h3>
    <div className="requests-list">
      {requests.length > 0 ? requests.map(req => (
        <div className="request-card" key={req.id}>
          <div className="req-user">
            <div className="req-avatar">{req.name.charAt(0)}</div>
            <div>
              <strong>{req.name}</strong>
              <span>Requesting to join as {req.role}</span>
            </div>
          </div>
          <div className="req-actions">
            <button className="approve-btn" onClick={() => onApprove(req)}><UserCheck size={18} /> Approve</button>
            <button className="reject-btn"><X size={18} /></button>
          </div>
        </div>
      )) : <div className="empty-requests">No pending requests at the moment.</div>}
    </div>
  </div>
);

const GroupsModule = () => (
  <div className="groups-container">
    <div className="table-header">
      <h3>Groups & Classes</h3>
      <button className="add-btn"><Plus size={18} /> Create Group</button>
    </div>
    <div className="groups-grid">
      <GroupCard name="Science Department" count={8} icon={<Building2 />} />
      <GroupCard name="Grade 10-A" count={32} icon={<Users2 />} />
      <GroupCard name="Sports Committee" count={12} icon={<UserCheck />} />
    </div>
  </div>
);

const GroupCard = ({ name, count, icon }) => (
  <div className="group-card-item">
    <div className="group-icon-circle">{icon}</div>
    <h4>{name}</h4>
    <span>{count} Members</span>
    <button className="manage-link">Manage Members</button>
  </div>
);

const NotionPlaceholder = () => (
  <div className="notion-container">
    <div className="notion-header">
      <h1>School Document System</h1>
      <p>A collaborative, Notion-like workspace for your school.</p>
    </div>
    <div className="notion-mock">
      <div className="notion-line title">## School Circular: May 2024</div>
      <div className="notion-line">This is a rich text editor placeholder. Here you will be able to create:</div>
      <div className="notion-line bullet">- Meeting Minutes</div>
      <div className="notion-line bullet">- Exam Schedules</div>
      <div className="notion-line bullet">- Policy Documents</div>
    </div>
  </div>
);

export default Dashboard;
