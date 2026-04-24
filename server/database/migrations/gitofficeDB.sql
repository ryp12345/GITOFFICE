

--
-- Database: `gitoffice`
--
CREATE DATABASE IF NOT EXISTS `gitoffice` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `gitoffice`;

-- --------------------------------------------------------

--
-- Table structure for table `admissions`
--

CREATE TABLE `admissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `program_id` bigint(20) UNSIGNED NOT NULL,
  `program_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fees` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_card` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qual_exam` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qual_exam_percentage` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entrance_exam` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fees_received` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `balance_due_date` date DEFAULT NULL,
  `member_id` bigint(20) UNSIGNED DEFAULT NULL,
  `wl_no` int(11) DEFAULT NULL,
  `enquiry_date` date DEFAULT NULL,
  `cancel_date` date DEFAULT NULL,
  `place` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hostel` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile_no_2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `allowances`
--

CREATE TABLE `allowances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` double(8,2) NOT NULL,
  `value_type` enum('flat','percentage') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentage',
  `designations_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employee_type` enum('Teaching','Non-Teaching') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Teaching',
  `wef` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `allowance_staff`
--

CREATE TABLE `allowance_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `allowance_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `month` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int(11) NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `annual_increments`
--

CREATE TABLE `annual_increments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `wef` date NOT NULL,
  `additional_days` int(11) NOT NULL,
  `additional_days_type` enum('current_year','permanent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'permanent',
  `gc` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'null',
  `basic` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `associate_professor_applications`
--

CREATE TABLE `associate_professor_applications` (
  `id` int(11) NOT NULL,
  `advertisement_instance` date DEFAULT NULL,
  `application_no` varchar(255) DEFAULT NULL,
  `applicant_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `applicant_address` varchar(255) DEFAULT NULL,
  `applicant_phone` bigint(20) DEFAULT NULL,
  `phd_university` varchar(255) DEFAULT NULL,
  `phd_reputed_university` tinyint(1) DEFAULT NULL,
  `ug_class` enum('F','S','T') DEFAULT NULL,
  `ug_branches` varchar(255) DEFAULT NULL,
  `pg_class` enum('F','S','T') DEFAULT NULL,
  `pg_specialization` varchar(255) DEFAULT NULL,
  `ug_pg_remarks` varchar(255) DEFAULT NULL,
  `experience_years` varchar(255) DEFAULT NULL,
  `experience_teaching` varchar(255) DEFAULT NULL,
  `experience_research` varchar(255) DEFAULT NULL,
  `experience_industry` varchar(255) DEFAULT NULL,
  `experience_remarks` varchar(255) DEFAULT NULL,
  `phd_date` date DEFAULT NULL,
  `post_phd_experience` varchar(255) DEFAULT NULL,
  `phd_remarks` varchar(255) DEFAULT NULL,
  `research_papers_count` int(11) DEFAULT NULL,
  `papers_in_SCI` int(50) DEFAULT NULL,
  `papers_in_UGC` int(50) DEFAULT NULL,
  `papers_in_AICTE` int(50) DEFAULT NULL,
  `research_remarks` varchar(255) DEFAULT NULL,
  `eligibility_status` enum('Eligible','Not Eligible') DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `publication` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `caste_name` varchar(255) DEFAULT NULL,
  `department_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `associations`
--

CREATE TABLE `associations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `asso_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('Associated','Temporary associated','Disassociated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Associated',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `association_staff`
--

CREATE TABLE `association_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `association_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `closing_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `autonomous_allowances`
--

CREATE TABLE `autonomous_allowances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `subject1_classes_conducted` int(11) DEFAULT NULL,
  `subject1_max_classes` int(11) DEFAULT NULL,
  `subject1_percentage` decimal(5,2) DEFAULT NULL,
  `subject2_classes_conducted` int(11) DEFAULT NULL,
  `subject2_max_classes` int(11) DEFAULT NULL,
  `subject2_percentage` decimal(5,2) DEFAULT NULL,
  `subject3_classes_conducted` int(11) DEFAULT NULL,
  `subject3_max_classes` int(11) DEFAULT NULL,
  `subject3_percentage` decimal(5,2) DEFAULT NULL,
  `average_percentage` decimal(5,2) DEFAULT NULL,
  `feedback_percentage` decimal(5,2) DEFAULT NULL,
  `feedback_marks` decimal(8,2) DEFAULT NULL,
  `industry_activity_points` int(11) DEFAULT NULL,
  `checkbox_selections` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`checkbox_selections`)),
  `research_points` int(11) DEFAULT NULL,
  `grants_points` int(11) DEFAULT NULL,
  `dept_points` int(11) DEFAULT NULL,
  `organized_points` int(11) DEFAULT NULL,
  `hod_discretion` int(11) DEFAULT NULL,
  `principal_discretion` int(11) DEFAULT NULL,
  `total_marks` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `book_publications`
--

CREATE TABLE `book_publications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `book_level` enum('National','International') COLLATE utf8mb4_unicode_ci NOT NULL,
  `publisher_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edition` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `issue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('Book','Chapter') COLLATE utf8mb4_unicode_ci NOT NULL,
  `chapter_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_page_no` int(11) DEFAULT NULL,
  `end_page_no` int(11) DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `castecategories`
--

CREATE TABLE `castecategories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `caste_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `religion_id` bigint(20) UNSIGNED NOT NULL,
  `subcastes_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `combine_leaves`
--

CREATE TABLE `combine_leaves` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `leave_id` bigint(20) UNSIGNED NOT NULL,
  `combined_id` bigint(20) UNSIGNED NOT NULL,
  `sandwitchable` enum('Bothside','Oneside') COLLATE utf8mb4_unicode_ci NOT NULL,
  `wef` date NOT NULL,
  `closing_wef` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conferences_attendees`
--

CREATE TABLE `conferences_attendees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conference_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attended_as` enum('Resource Person','Participant','Paper Presenter','Session Chair') COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `no_of_days` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `place` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sponsored` enum('Yes','No') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sponsored_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` int(11) DEFAULT NULL,
  `weblink` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_of_level` enum('National','International') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ISSN_NO` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(225) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conferences_attendee_staff`
--

CREATE TABLE `conferences_attendee_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `conferences_attendee_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conferences_conducteds`
--

CREATE TABLE `conferences_conducteds` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conference_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `co_organizer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_of_participants` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sponsored` enum('Yes','No') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sponsoring_agency` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `no_of_days` int(11) NOT NULL,
  `place` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `publisher` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Convener','Co-convener','Team Member','Coordinator') COLLATE utf8mb4_unicode_ci NOT NULL,
  `weblink` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_of_level` enum('National','International') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ISSN_NO` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conferences_conducted_staff`
--

CREATE TABLE `conferences_conducted_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `conferences_conducted_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `consolidated_teaching_pays`
--

CREATE TABLE `consolidated_teaching_pays` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `pay` double UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `closing_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `consultancies`
--

CREATE TABLE `consultancies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `consultancy_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agency` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `amount` double NOT NULL,
  `role` enum('Chief Coordinator','Coordinator','Team Member') COLLATE utf8mb4_unicode_ci NOT NULL,
  `consultancy_type` enum('consultancy','testing','','') COLLATE utf8mb4_unicode_ci NOT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coordinators`
--

CREATE TABLE `coordinators` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_type` enum('Teaching','Non-Teaching','Both','') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Teaching',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coordinator_staffs`
--
-- Error reading structure for table gitoffice.coordinator_staffs: #1932 - Table &#039;gitoffice.coordinator_staffs&#039; doesn&#039;t exist in engine

-- --------------------------------------------------------

--
-- Table structure for table `copyrights`
--

CREATE TABLE `copyrights` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `copyright_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `copyright_date` date NOT NULL,
  `author_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Applied','Awarded') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_student`
--

CREATE TABLE `course_student` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `preference` int(11) NOT NULL,
  `final_preference` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','rejected','enrolled','no vacancy') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daywise_admission_counts`
--

CREATE TABLE `daywise_admission_counts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `academic_year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admission_count` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daywise__leaves`
--

CREATE TABLE `daywise__leaves` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `leave_staff_applications_id` bigint(20) UNSIGNED NOT NULL,
  `leave_id` bigint(20) UNSIGNED NOT NULL,
  `start` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `da_teaching_payscales`
--

CREATE TABLE `da_teaching_payscales` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `da` int(11) NOT NULL,
  `teaching_payscale_id` bigint(20) UNSIGNED NOT NULL,
  `wef` date NOT NULL,
  `closed_date` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dept_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept_shortname` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `yoe` date NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `hod_user_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `department_domains`
--

CREATE TABLE `department_domains` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `department_event`
--

CREATE TABLE `department_event` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `department_notice`
--

CREATE TABLE `department_notice` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `notice_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `department_staff`
--

CREATE TABLE `department_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dept_mgtquota_admissions`
--

CREATE TABLE `dept_mgtquota_admissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `program_id` bigint(20) UNSIGNED NOT NULL,
  `quota` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dept_stationary_indents`
--

CREATE TABLE `dept_stationary_indents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `designations`
--

CREATE TABLE `designations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `design_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isadditional` tinyint(4) NOT NULL DEFAULT 0,
  `isvacational` enum('Vacational','Non-Vacational') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Vacational',
  `leave_authorizer` enum('Principal','HoD','Chairman') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HoD',
  `emp_type` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '0-teaching\r\n1-non teaching',
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `designation_ntcpayscale`
--

CREATE TABLE `designation_ntcpayscale` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `designation_id` bigint(20) NOT NULL,
  `ntcpayscale_id` bigint(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `designation_ntpayscale`
--

CREATE TABLE `designation_ntpayscale` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `designation_id` bigint(20) UNSIGNED NOT NULL,
  `ntpayscale_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `designation_staff`
--

CREATE TABLE `designation_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `designation_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `dept_id` bigint(20) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `allowance_status` enum('Allowance','Grading','Both','') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Allowance=>special allowance, Grading=>autonomous grading, Both=>allowance and grading both to be given',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr_close` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_types`
--

CREATE TABLE `employee_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `employee_type` enum('Teaching','Non-Teaching') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `event_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `to_date` datetime NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizers` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_website` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_type` enum('Teaching','Non-Teaching','All') COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ev_requests`
--

CREATE TABLE `ev_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usn` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `program` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cgpa_percentage` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purpose` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passing_year` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `degree_obtained` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_section_issues`
--

CREATE TABLE `exam_section_issues` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `issues` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` enum('regular','unusual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `duration` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_courses`
--

CREATE TABLE `fastrack_courses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ft_course_type_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ft_instance_id` bigint(20) UNSIGNED NOT NULL,
  `no_of_students` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_expenses`
--

CREATE TABLE `fastrack_expenses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ft_expense_master_id` bigint(20) UNSIGNED NOT NULL,
  `academic_year` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expense_amount` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_expenses_master`
--

CREATE TABLE `fastrack_expenses_master` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_instances`
--

CREATE TABLE `fastrack_instances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ft_instance_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `academic_year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheme_id` bigint(20) UNSIGNED NOT NULL,
  `max_theory_class` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `max_lab_class` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_fees_collected` int(11) DEFAULT NULL,
  `deadline_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_instance_program`
--

CREATE TABLE `fastrack_instance_program` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `fastrack_instance_id` bigint(20) UNSIGNED NOT NULL,
  `program_id` bigint(20) UNSIGNED NOT NULL,
  `semester` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_pays`
--

CREATE TABLE `fastrack_pays` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `academic_year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `management` int(11) DEFAULT NULL,
  `rem_theory` int(11) DEFAULT NULL,
  `rem_lab_teaching` int(11) DEFAULT NULL,
  `rem_lab_instructors` int(11) DEFAULT NULL,
  `rem_lab_peon` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fastrack_staffs`
--

CREATE TABLE `fastrack_staffs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `instructor_foreman_id` int(11) DEFAULT NULL,
  `peon_attender_id` int(11) DEFAULT NULL,
  `course_id` bigint(20) UNSIGNED NOT NULL,
  `classes_conducted` int(11) DEFAULT NULL,
  `labs_conducted` int(11) DEFAULT NULL,
  `status` enum('Pending','Verified','Approved','') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `document` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ft_justification` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `festival_advances`
--

CREATE TABLE `festival_advances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `fyear` year(4) NOT NULL,
  `amount` bigint(20) NOT NULL,
  `start_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fixed_nt_pays`
--

CREATE TABLE `fixed_nt_pays` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `pay` double UNSIGNED NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `closed_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ftcourses`
--

CREATE TABLE `ftcourses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `course_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Is_Remunerated` enum('Yes','No','','') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Yes',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `funded_projects`
--

CREATE TABLE `funded_projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `proposal_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Principle Investigator','Co-Investigator','Not-Applicable','Architect') COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('Govt-funded','Private funded') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` double UNSIGNED NOT NULL,
  `proposal_status` enum('Accepted','Pending','Rejected') COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_date` date NOT NULL,
  `fund_received` double UNSIGNED DEFAULT NULL,
  `project_status` enum('On-Going','Completed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `completion_year` smallint(5) UNSIGNED DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `general_achievements`
--

CREATE TABLE `general_achievements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `award` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int(11) NOT NULL,
  `details` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `awarding_body` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(225) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `grading_staffs`
--

CREATE TABLE `grading_staffs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `month` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int(11) NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `holidayrhs`
--

CREATE TABLE `holidayrhs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `year` int(11) NOT NULL,
  `title` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start` date NOT NULL,
  `day` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('Holiday','RH') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `industries`
--

CREATE TABLE `industries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `registration_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_of_establishment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `industryintakes`
--

CREATE TABLE `industryintakes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `industry_id` bigint(20) UNSIGNED NOT NULL,
  `academic_year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intake` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `institutions`
--

CREATE TABLE `institutions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acronym` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `institution_staff`
--

CREATE TABLE `institution_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `institution_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `interactions`
--

CREATE TABLE `interactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `studentinternship_id` bigint(20) UNSIGNED NOT NULL,
  `spoc_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `idate` date NOT NULL,
  `topic` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `interaction_with` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `issue_timelines`
--

CREATE TABLE `issue_timelines` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `date_of_interaction` date NOT NULL,
  `interaction` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `followup_date` date DEFAULT NULL,
  `status` enum('open','followup','resolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `status_updated_date` date NOT NULL,
  `status_updated_by` bigint(20) UNSIGNED NOT NULL,
  `student_issue_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `laptoploans`
--

CREATE TABLE `laptoploans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `date_of_application` date NOT NULL,
  `configuration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int(11) NOT NULL,
  `emi` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `candidate_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('New','Interested','Hot Lead','Not Interested','Query','Invalid','Admitted to Other College','No Response','Number repeated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'New',
  `contact_date` date DEFAULT NULL,
  `academic_year` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lead_staff_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead_interactions`
--

CREATE TABLE `lead_interactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `interaction_type` enum('call','email','meeting','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'call',
  `interaction_topic` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interaction_date` date DEFAULT NULL,
  `interaction_time` time NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'New',
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead_program`
--

CREATE TABLE `lead_program` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `lead_id` bigint(20) UNSIGNED NOT NULL,
  `program_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `preference` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT 'I'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `longname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shortname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `max_entitlement` int(11) DEFAULT NULL,
  `min_days` double(8,2) NOT NULL,
  `max_days` double(8,2) DEFAULT NULL,
  `vacation_type` enum('Vacational','Non-vacational') COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicable_to` enum('confirmed','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `leave_wef` date NOT NULL,
  `leave_end_date` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_rules`
--

CREATE TABLE `leave_rules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `leave_id` bigint(20) UNSIGNED NOT NULL,
  `carry_forwardable` enum('Yes','No') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'No',
  `cf_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cf_wef` date NOT NULL,
  `cf_closing_date` date DEFAULT NULL,
  `cf_closing_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_cf` int(11) NOT NULL DEFAULT 0,
  `entitlement_post_max_cf` int(11) DEFAULT NULL,
  `encashable` enum('Yes','No') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'No',
  `enc_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enc_wef` date NOT NULL,
  `enc_closing_date` date DEFAULT NULL,
  `enc_closing_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_enc` int(11) NOT NULL DEFAULT 0,
  `gap` enum('Yes','No') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'No',
  `gap_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gap_wef` date DEFAULT NULL,
  `gap_closing_date` date DEFAULT NULL,
  `gap_closing_gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `min_gap` int(11) NOT NULL DEFAULT 0,
  `max_time_allowed` int(11) DEFAULT NULL,
  `period` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prior_intimation_days` int(11) DEFAULT 0,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_staff_applications`
--

CREATE TABLE `leave_staff_applications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `leave_id` bigint(20) UNSIGNED NOT NULL,
  `cl_type` enum('Morning','Afternoon','Full') COLLATE utf8mb4_unicode_ci DEFAULT 'Full',
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `alternate` bigint(20) UNSIGNED NOT NULL,
  `additional_alternate` bigint(20) UNSIGNED DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `recommender` bigint(20) UNSIGNED DEFAULT NULL,
  `approver` bigint(20) UNSIGNED DEFAULT NULL,
  `start` date NOT NULL,
  `end` date NOT NULL,
  `no_of_days` float NOT NULL,
  `appl_status` enum('recommended','pending','rejected','approved','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `leave_status` enum('taken','awaiting') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'awaiting',
  `year` smallint(5) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_staff_entitlements`
--

CREATE TABLE `leave_staff_entitlements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `year` int(4) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `leave_id` bigint(20) UNSIGNED NOT NULL,
  `entitled_curr_year` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `accumulated` int(10) UNSIGNED DEFAULT 0,
  `consumed_curr_year` decimal(5,1) UNSIGNED NOT NULL DEFAULT 0.0,
  `encashed_curr_year` int(10) UNSIGNED DEFAULT 0,
  `total_encashed` int(10) UNSIGNED DEFAULT 0,
  `wef` date NOT NULL,
  `remarks` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL COMMENT 'remarks for additional entitlement in ase of additional designation closing',
  `status` enum('active','inactive') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mgmtmembers`
--

CREATE TABLE `mgmtmembers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `member_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `designation` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `level` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `naacs`
--

CREATE TABLE `naacs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cycle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year_of_assesment` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `v_from_date` date NOT NULL,
  `v_to_date` date NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nbas`
--

CREATE TABLE `nbas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cycle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_of_assesments` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nba_programs`
--

CREATE TABLE `nba_programs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nba_id` bigint(20) UNSIGNED NOT NULL,
  `program_id` bigint(20) UNSIGNED NOT NULL,
  `v_from_date` date NOT NULL,
  `v_to_date` date NOT NULL,
  `score` double(8,2) NOT NULL,
  `exten_status` enum('Extended','Not Extended') COLLATE utf8mb4_unicode_ci DEFAULT 'Not Extended',
  `exten_period` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exten_form` date DEFAULT NULL,
  `exten_to` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nirfs`
--

CREATE TABLE `nirfs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rank_detail` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notices`
--

CREATE TABLE `notices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_type` enum('Teaching','Non-Teaching','All') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `notification_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` enum('Leave','Qualification','Event') COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ntcpayscales`
--

CREATE TABLE `ntcpayscales` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `basepay` bigint(20) NOT NULL,
  `allowance` int(11) NOT NULL,
  `year` tinyint(4) NOT NULL,
  `wef` date NOT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `closedon` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ntcpayscale_staff`
--

CREATE TABLE `ntcpayscale_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `ntcpayscale_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ntissue_timelines`
--

CREATE TABLE `ntissue_timelines` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `date_of_interaction` date NOT NULL,
  `interaction` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `followup_date` date NOT NULL,
  `status` enum('open','followup','resolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `status_updated_date` date NOT NULL,
  `status_updated_by` bigint(20) UNSIGNED NOT NULL,
  `student_issue_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ntpayscales`
--

CREATE TABLE `ntpayscales` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payband` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wef` date NOT NULL,
  `closedon` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ntpayscale_staff`
--

CREATE TABLE `ntpayscale_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `ntpayscale_id` bigint(20) UNSIGNED NOT NULL,
  `level` tinyint(4) NOT NULL DEFAULT 1,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patents`
--

CREATE TABLE `patents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `appl_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appl_date` date NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stream_domain` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Pending','Awarded','Rejected','Granted','Published') COLLATE utf8mb4_unicode_ci NOT NULL,
  `patent_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publication_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publication_date` date DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_tickets`
--

CREATE TABLE `post_tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_attachment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professional_activity_attendees`
--

CREATE TABLE `professional_activity_attendees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Participant','Resource Person','Jury') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Participant',
  `level` enum('Local','National','International') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('Workshop','FDP','Seminar','Webinar','Certification Program','MDP/EDP','Hackathon','Space-Talk','Site Visit','STTP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sponsored` enum('Yes','No') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sponsored_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `no_of_days` int(11) NOT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professional_activity_attendee_staff`
--

CREATE TABLE `professional_activity_attendee_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `professional_activity_attendee_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professional_activity_conducteds`
--

CREATE TABLE `professional_activity_conducteds` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organizer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `co_organizer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` enum('Local','National','International') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('Workshop','Seminar','Webinar','FDP','STTP','MDP/EDP','Certification Program','Space-Talk','Site Visit','Hackathon') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sponsored` enum('Yes','No') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sponsoring_agency_name_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `place` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_of_days` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Coordinator','Convenor','Member','') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professional_activity_conducted_staff`
--

CREATE TABLE `professional_activity_conducted_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `professional_activity_conducted_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professor_applications`
--

CREATE TABLE `professor_applications` (
  `id` int(11) NOT NULL,
  `advertisement_instance` date DEFAULT NULL,
  `application_no` varchar(255) DEFAULT NULL,
  `applicant_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `applicant_address` varchar(255) DEFAULT NULL,
  `applicant_phone` bigint(20) DEFAULT NULL,
  `phd_university` varchar(255) DEFAULT NULL,
  `phd_reputed_university` tinyint(1) DEFAULT NULL,
  `ug_class` enum('F','S','T') DEFAULT NULL,
  `ug_branches` varchar(255) DEFAULT NULL,
  `pg_class` enum('F','S','T') DEFAULT NULL,
  `pg_specialization` varchar(255) DEFAULT NULL,
  `ug_pg_remarks` varchar(255) DEFAULT NULL,
  `type` enum('Education','Industry','','') DEFAULT NULL,
  `designation` enum('Assistant Professor','Associate Professor','Professor','') DEFAULT NULL,
  `industry_designation` varchar(255) DEFAULT NULL,
  `from_date_asso_prof` date DEFAULT NULL,
  `to_date_asso_prof` date DEFAULT NULL,
  `experience_teaching` varchar(255) DEFAULT NULL,
  `experience_research` varchar(255) DEFAULT NULL,
  `experience_industry` varchar(255) DEFAULT NULL,
  `experience_years` varchar(255) DEFAULT NULL,
  `experience_remarks` varchar(255) DEFAULT NULL,
  `post_asso_prof_experience` varchar(255) DEFAULT NULL,
  `asso_prof_experience_remarks` varchar(255) DEFAULT NULL,
  `associate_level` varchar(255) DEFAULT NULL,
  `research_papers_count` int(11) DEFAULT NULL,
  `papers_in_SCI` int(50) DEFAULT NULL,
  `papers_in_UGC` int(50) DEFAULT NULL,
  `papers_in_AICTE` int(50) DEFAULT NULL,
  `research_scholars_count` int(50) DEFAULT NULL,
  `research_remarks` varchar(255) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `publication` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `caste_name` varchar(255) NOT NULL,
  `eligibility_status` enum('Eligible','Not Eligible') DEFAULT NULL,
  `department_id` bigint(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `program_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `program_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `start_date` date NOT NULL,
  `close_date` date NOT NULL,
  `type` enum('UG','PG') COLLATE utf8mb4_unicode_ci NOT NULL,
  `program_intake` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `publications`
--

CREATE TABLE `publications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `level` enum('Q1','Q2','Q3','Q4','Web of Science','SCI','Scopus Indexed','UGC General','Other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `other_level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `journal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doi_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `volume` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `page_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `publication_type` enum('Journal','Conference Proceeding') COLLATE utf8mb4_unicode_ci NOT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qualifications`
--

CREATE TABLE `qualifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `qual_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qual_shortname` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `qualification_staff`
--

CREATE TABLE `qualification_staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `qualification_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `board_university` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `yop` date DEFAULT NULL,
  `status` enum('Persuing','Completed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `religions`
--

CREATE TABLE `religions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `religion_name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `remunerationheads`
--

CREATE TABLE `remunerationheads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `remuneration_head` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviewer_editors`
--

CREATE TABLE `reviewer_editors` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `egov_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `publisher_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewed_date` date NOT NULL,
  `level` enum('Q1','Q2','Q3','Q4','SCI','Web of Science','Scopus Indexed','UGC General','Other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `other_level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('Journal','Conference Proceeding') COLLATE utf8mb4_unicode_ci NOT NULL,
  `validation_status` enum('new','valid','invalid','updated') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schemes`
--

CREATE TABLE `schemes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `scheme_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `spocs`
--

CREATE TABLE `spocs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `industry_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` bigint(20) NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `designation` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `fname` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mname` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lname` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `local_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `permanent_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` date NOT NULL,
  `doj` date NOT NULL,
  `religion_id` bigint(20) UNSIGNED NOT NULL,
  `castecategory_id` bigint(20) UNSIGNED NOT NULL,
  `gender` enum('female','male','others') COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_increment` date DEFAULT NULL,
  `date_of_superanuation` date NOT NULL,
  `date_of_confirmation` date DEFAULT NULL,
  `bloodgroup` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_card` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adhar_card` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactno` bigint(20) DEFAULT NULL,
  `aicte_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vtu_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `esi_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `un_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_no` bigint(21) DEFAULT NULL,
  `emergency_name` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `EmployeeCode` int(11) NOT NULL DEFAULT 0,
  `profile_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `PF` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stafflics`
--

CREATE TABLE `stafflics` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `policy_no` int(11) NOT NULL,
  `premium` double NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','transfered','stopped','') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stafflic_transactions`
--

CREATE TABLE `stafflic_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `stafflic_id` bigint(20) UNSIGNED NOT NULL,
  `gst` decimal(10,0) UNSIGNED NOT NULL,
  `month` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `year` year(4) NOT NULL,
  `dop` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staffloans`
--

CREATE TABLE `staffloans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `member_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_amount` double(8,2) NOT NULL,
  `monthly_EMI` double(8,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staffremunerationheads`
--

CREATE TABLE `staffremunerationheads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `remunerationhead_id` bigint(20) UNSIGNED NOT NULL,
  `date_of_disbursement` date DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `financial_year` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staffsalaries`
--

CREATE TABLE `staffsalaries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `rate` bigint(20) NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `basic` double(8,2) UNSIGNED NOT NULL,
  `da` double(8,2) UNSIGNED NOT NULL,
  `hra` double(8,2) UNSIGNED NOT NULL,
  `cca` double(8,2) UNSIGNED NOT NULL,
  `special_incen` double(8,2) UNSIGNED NOT NULL,
  `salary_arrears` double(8,2) UNSIGNED NOT NULL,
  `special_allowances` double(8,2) UNSIGNED NOT NULL,
  `allowance_value` double(8,2) UNSIGNED NOT NULL,
  `gross_salary` double(8,2) UNSIGNED NOT NULL,
  `pf_deduction` double(8,2) UNSIGNED NOT NULL,
  `pf_arrears` double(8,2) UNSIGNED NOT NULL,
  `income_tax` double(8,2) UNSIGNED NOT NULL,
  `prof_tax` double(8,2) UNSIGNED NOT NULL,
  `lic` double(8,2) UNSIGNED DEFAULT NULL,
  `gsli` double(8,2) UNSIGNED NOT NULL,
  `credit_shares` double(8,2) UNSIGNED NOT NULL,
  `credit_loan` double(8,2) UNSIGNED NOT NULL,
  `vidyaganapati` double(8,2) UNSIGNED NOT NULL,
  `forward_charges` double(8,2) UNSIGNED NOT NULL,
  `salary_recovery` double(8,2) UNSIGNED NOT NULL,
  `ir` double(8,2) UNSIGNED NOT NULL,
  `hra_recovery` double(8,2) UNSIGNED NOT NULL,
  `laptop_computer` double(8,2) UNSIGNED NOT NULL,
  `total_deductions` double(8,2) UNSIGNED NOT NULL,
  `net_salary` double(8,2) UNSIGNED NOT NULL,
  `remarks` varchar(625) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staffshares`
--

CREATE TABLE `staffshares` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `member_id` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `amount` double DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','inactive','','') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_form16s`
--

CREATE TABLE `staff_form16s` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `document` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'form16 partA',
  `partb` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'form16 partb',
  `year` year(4) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_taxregime`
--

CREATE TABLE `staff_taxregime` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `tax_heads_id` bigint(20) UNSIGNED NOT NULL,
  `finyear` varchar(12) COLLATE utf8_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_tds`
--

CREATE TABLE `staff_tds` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `staffsalary_id` bigint(20) UNSIGNED NOT NULL,
  `staff_taxregime_id` bigint(20) UNSIGNED NOT NULL,
  `staff_tdshead_id` bigint(20) UNSIGNED NOT NULL,
  `tds` double UNSIGNED NOT NULL,
  `month` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` year(4) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_teaching_payscale`
--

CREATE TABLE `staff_teaching_payscale` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `teaching_payscale_id` bigint(20) UNSIGNED NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gcr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stationaries`
--

CREATE TABLE `stationaries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specification` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stationary_indent_and_grants`
--

CREATE TABLE `stationary_indent_and_grants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `stationary_id` bigint(20) UNSIGNED NOT NULL,
  `request_quantity` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_date` date NOT NULL,
  `given_quantity` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grant_quantity` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  `grant_date` date DEFAULT NULL,
  `dept_stationary_indent_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `studentinternships`
--

CREATE TABLE `studentinternships` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `years` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sdate` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edate` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `industry_id` bigint(20) UNSIGNED NOT NULL,
  `spoc_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `Stipend` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usn` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_of_weeks` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `internal_mark` int(11) DEFAULT NULL,
  `external_mark` int(11) DEFAULT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_issues`
--

CREATE TABLE `student_issues` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usn` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_no` bigint(20) NOT NULL,
  `exam_section_issue_id` bigint(20) DEFAULT NULL,
  `other_issue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_studentinternship`
--

CREATE TABLE `student_studentinternship` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `studentinternship_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_heads`
--

CREATE TABLE `tax_heads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` year(4) NOT NULL,
  `std_ded` decimal(10,2) NOT NULL DEFAULT 75000.00,
  `threshold` int(11) NOT NULL,
  `margin` int(11) NOT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_slabs`
--

CREATE TABLE `tax_slabs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `regime_id` bigint(20) UNSIGNED NOT NULL,
  `lower_limit` decimal(10,2) NOT NULL,
  `upper_limit` decimal(10,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tdsheads`
--

CREATE TABLE `tdsheads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teaching_payscales`
--

CREATE TABLE `teaching_payscales` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payscale_title` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `basepay` double(8,2) NOT NULL,
  `maxpay` double(8,2) NOT NULL,
  `designations_id` bigint(20) UNSIGNED NOT NULL,
  `agp` double(8,2) NOT NULL,
  `da` double(8,2) NOT NULL,
  `hra` double(8,2) NOT NULL,
  `cca` double(8,2) NOT NULL,
  `wef` date NOT NULL,
  `closedon` date DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenders`
--

CREATE TABLE `tenders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `close_date` date NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('active','closed','inactive','') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `document` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kls_institution` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tender_configs`
--

CREATE TABLE `tender_configs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `configuration` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tender_id` bigint(20) UNSIGNED NOT NULL,
  `unit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int(255) NOT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `term_conditions` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tender_config_vendors`
--

CREATE TABLE `tender_config_vendors` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tender_configs_id` bigint(20) UNSIGNED NOT NULL,
  `t_vendor_id` bigint(20) UNSIGNED NOT NULL,
  `rate` decimal(10,2) DEFAULT NULL,
  `gst` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendor_remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warranty_period` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendor_terms_conditions` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tender_status` enum('Opened','Not Opened','','') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Not Opened',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tender_departments`
--

CREATE TABLE `tender_departments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tender_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tender_quote_otp`
--

CREATE TABLE `tender_quote_otp` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tender_id` bigint(20) UNSIGNED NOT NULL,
  `t_vendor_id` bigint(20) UNSIGNED NOT NULL,
  `otp` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tender_t_vendor`
--

CREATE TABLE `tender_t_vendor` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tender_id` bigint(20) UNSIGNED NOT NULL,
  `t_vendor_id` bigint(20) UNSIGNED NOT NULL,
  `delivery_period` date DEFAULT NULL,
  `link_status` enum('ACCEPTED','REJECTED','','') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('New','Pending','Resolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'New',
  `attachment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `t_vendors`
--

CREATE TABLE `t_vendors` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `propritor_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_no` bigint(20) NOT NULL,
  `gst_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive','','') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vendors`
--

CREATE TABLE `vendors` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gst` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_no` bigint(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_domains_`
--

CREATE TABLE `_domains_` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admissions`
--
ALTER TABLE `admissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admissions_program_id_foreign` (`program_id`),
  ADD KEY `admissions_member_id_foreign` (`member_id`);

--
-- Indexes for table `allowances`
--
ALTER TABLE `allowances`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `allowance_staff`
--
ALTER TABLE `allowance_staff`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `annual_increments`
--
ALTER TABLE `annual_increments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ai_staff_id` (`staff_id`);

--
-- Indexes for table `associate_professor_applications`
--
ALTER TABLE `associate_professor_applications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `associations`
--
ALTER TABLE `associations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `association_staff`
--
ALTER TABLE `association_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `association_staff_associations_id_foreign` (`association_id`),
  ADD KEY `association_staff_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `autonomous_allowances`
--
ALTER TABLE `autonomous_allowances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `autonomous_allowances_staff_id_foreign` (`staff_id`),
  ADD KEY `autonomous_allowances_department_id_foreign` (`department_id`);

--
-- Indexes for table `book_publications`
--
ALTER TABLE `book_publications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `egov_id` (`egov_id`),
  ADD KEY `book_publications_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `castecategories`
--
ALTER TABLE `castecategories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `castecategories_religion_id_foreign` (`religion_id`);

--
-- Indexes for table `combine_leaves`
--
ALTER TABLE `combine_leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `combine_leave_leave_id_foreign` (`leave_id`),
  ADD KEY `combine_leave_combined_id_foreign` (`combined_id`);

--
-- Indexes for table `conferences_attendees`
--
ALTER TABLE `conferences_attendees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `egov_id` (`egov_id`);

--
-- Indexes for table `conferences_attendee_staff`
--
ALTER TABLE `conferences_attendee_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `conferences_attendee_staff_staff_id_foreign` (`staff_id`),
  ADD KEY `conferences_attendee_staff_conferences_attendee_id_foreign` (`conferences_attendee_id`);

--
-- Indexes for table `conferences_conducteds`
--
ALTER TABLE `conferences_conducteds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `egov_id` (`egov_id`);

--
-- Indexes for table `conferences_conducted_staff`
--
ALTER TABLE `conferences_conducted_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `conferences_conducted_staff_staff_id_foreign` (`staff_id`),
  ADD KEY `conferences_conducted_staff_conferences_conducted_id_foreign` (`conferences_conducted_id`);

--
-- Indexes for table `consolidated_teaching_pays`
--
ALTER TABLE `consolidated_teaching_pays`
  ADD PRIMARY KEY (`id`),
  ADD KEY `consolidated_teaching_pays_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `consultancies`
--
ALTER TABLE `consultancies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `consultancies_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `coordinators`
--
ALTER TABLE `coordinators`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `copyrights`
--
ALTER TABLE `copyrights`
  ADD PRIMARY KEY (`id`),
  ADD KEY `copyrights_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `course_student`
--
ALTER TABLE `course_student`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `daywise_admission_counts`
--
ALTER TABLE `daywise_admission_counts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `daywise__leaves`
--
ALTER TABLE `daywise__leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_leave_staff_application_id` (`leave_staff_applications_id`);

--
-- Indexes for table `da_teaching_payscales`
--
ALTER TABLE `da_teaching_payscales`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `departments_dept_shortname_unique` (`dept_shortname`),
  ADD KEY `fk_departments_user_id` (`hod_user_id`);

--
-- Indexes for table `department_domains`
--
ALTER TABLE `department_domains`
  ADD PRIMARY KEY (`id`),
  ADD KEY `department_domains_department_id_foreign` (`department_id`);

--
-- Indexes for table `department_event`
--
ALTER TABLE `department_event`
  ADD PRIMARY KEY (`id`),
  ADD KEY `department_events_event_id_foreign` (`event_id`),
  ADD KEY `department_events_department_id_foreign` (`department_id`);

--
-- Indexes for table `department_notice`
--
ALTER TABLE `department_notice`
  ADD PRIMARY KEY (`id`),
  ADD KEY `department_notice_notice_id_foreign` (`notice_id`),
  ADD KEY `department_notice_department_id_foreign` (`department_id`);

--
-- Indexes for table `department_staff`
--
ALTER TABLE `department_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `department_staff_departments_id_foreign` (`department_id`),
  ADD KEY `department_staff_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `dept_mgtquota_admissions`
--
ALTER TABLE `dept_mgtquota_admissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `dept_mgtquota_admissions_program_id_foreign` (`program_id`);

--
-- Indexes for table `dept_stationary_indents`
--
ALTER TABLE `dept_stationary_indents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_department_id` (`department_id`);

--
-- Indexes for table `designations`
--
ALTER TABLE `designations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `designations_design_name_unique` (`design_name`);

--
-- Indexes for table `designation_ntcpayscale`
--
ALTER TABLE `designation_ntcpayscale`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `designation_ntpayscale`
--
ALTER TABLE `designation_ntpayscale`
  ADD PRIMARY KEY (`id`),
  ADD KEY `designation_ntpayscales_designations_id_foreign` (`designation_id`),
  ADD KEY `designation_ntpayscales_ntpayscales_id_foreign` (`ntpayscale_id`);

--
-- Indexes for table `designation_staff`
--
ALTER TABLE `designation_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `designation_staff_designations_id_foreign` (`designation_id`),
  ADD KEY `designation_staff_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `employee_types`
--
ALTER TABLE `employee_types`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_type_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `events_user_id_foreign` (`user_id`);

--
-- Indexes for table `ev_requests`
--
ALTER TABLE `ev_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exam_section_issues`
--
ALTER TABLE `exam_section_issues`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `fastrack_courses`
--
ALTER TABLE `fastrack_courses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fastrack_courses_department_id_foreign` (`department_id`),
  ADD KEY `foreign_ft_course_type_id` (`ft_course_type_id`),
  ADD KEY `FK_instance_id` (`ft_instance_id`);

--
-- Indexes for table `fastrack_expenses`
--
ALTER TABLE `fastrack_expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ft_expense_master_id` (`ft_expense_master_id`);

--
-- Indexes for table `fastrack_expenses_master`
--
ALTER TABLE `fastrack_expenses_master`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `fastrack_instances`
--
ALTER TABLE `fastrack_instances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fastrack_instances_scheme_id_foreign` (`scheme_id`);

--
-- Indexes for table `fastrack_instance_program`
--
ALTER TABLE `fastrack_instance_program`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fastrack_instance_programs_fastrack_instance_id_foreign` (`fastrack_instance_id`),
  ADD KEY `fastrack_instance_programs_program_id_foreign` (`program_id`);

--
-- Indexes for table `fastrack_pays`
--
ALTER TABLE `fastrack_pays`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `fastrack_staffs`
--
ALTER TABLE `fastrack_staffs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fastrack_staffs_staff_id_foreign` (`staff_id`),
  ADD KEY `fastrack_staffs_course_id_foreign` (`course_id`);

--
-- Indexes for table `festival_advances`
--
ALTER TABLE `festival_advances`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `fixed_nt_pays`
--
ALTER TABLE `fixed_nt_pays`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fixed_nt_pay_staff_id_foreign_key` (`staff_id`);

--
-- Indexes for table `ftcourses`
--
ALTER TABLE `ftcourses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `funded_projects`
--
ALTER TABLE `funded_projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `funded_projects_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `general_achievements`
--
ALTER TABLE `general_achievements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `general_achievements_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `grading_staffs`
--
ALTER TABLE `grading_staffs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `grading_staffs_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `holidayrhs`
--
ALTER TABLE `holidayrhs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `industries`
--
ALTER TABLE `industries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `industryintakes`
--
ALTER TABLE `industryintakes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_industry_intake_status_industry_id` (`industry_id`);

--
-- Indexes for table `institutions`
--
ALTER TABLE `institutions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `institution_staff`
--
ALTER TABLE `institution_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `institution_staff_institution_id_foreign` (`institution_id`),
  ADD KEY `institution_staff_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `interactions`
--
ALTER TABLE `interactions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `issue_timelines`
--
ALTER TABLE `issue_timelines`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `laptoploans`
--
ALTER TABLE `laptoploans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_laptop_loan_staff_id` (`staff_id`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lead_interactions`
--
ALTER TABLE `lead_interactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lead_interactions_lead_id_foreign` (`lead_id`),
  ADD KEY `lead_interactions_user_id_foreign` (`staff_id`);

--
-- Indexes for table `lead_program`
--
ALTER TABLE `lead_program`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lead_program_program_id_foreign` (`program_id`),
  ADD KEY `lead_program_lead_id_foreign` (`lead_id`);

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leave_rules`
--
ALTER TABLE `leave_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `leave_rule_leave_id_foreign` (`leave_id`);

--
-- Indexes for table `leave_staff_applications`
--
ALTER TABLE `leave_staff_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `leave_staff_applications_leave_id_foreign` (`leave_id`),
  ADD KEY `leave_staff_applications_staff_id_foreign` (`staff_id`),
  ADD KEY `leave_staff_applications_alternate_foreign` (`alternate`);

--
-- Indexes for table `leave_staff_entitlements`
--
ALTER TABLE `leave_staff_entitlements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_leaves_entitlement_id` (`leave_id`),
  ADD KEY `fk_staff_leave_entitlement_id` (`staff_id`);

--
-- Indexes for table `mgmtmembers`
--
ALTER TABLE `mgmtmembers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `naacs`
--
ALTER TABLE `naacs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `nbas`
--
ALTER TABLE `nbas`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `nba_programs`
--
ALTER TABLE `nba_programs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nba_programs_nba_id_foreign` (`nba_id`),
  ADD KEY `nba_programs_program_id_foreign` (`program_id`);

--
-- Indexes for table `nirfs`
--
ALTER TABLE `nirfs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notices`
--
ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notices_user_id_foreign` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_foreign` (`user_id`);

--
-- Indexes for table `ntcpayscales`
--
ALTER TABLE `ntcpayscales`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ntcpayscale_staff`
--
ALTER TABLE `ntcpayscale_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ntcpayscale_staff_staff_id_foreign` (`staff_id`),
  ADD KEY `ntcpayscale_staff_ntcpayscale_id_foreign` (`ntcpayscale_id`);

--
-- Indexes for table `ntissue_timelines`
--
ALTER TABLE `ntissue_timelines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ntissue_timelines_student_issue_id_foreign` (`student_issue_id`),
  ADD KEY `ntissue_timelines_status_updated_by_foreign` (`status_updated_by`);

--
-- Indexes for table `ntpayscales`
--
ALTER TABLE `ntpayscales`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ntpayscale_staff`
--
ALTER TABLE `ntpayscale_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ntpayscale_staff_staff_id_foreign` (`staff_id`),
  ADD KEY `ntpayscale_staff_ntpayscale_id_foreign` (`ntpayscale_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `patents`
--
ALTER TABLE `patents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `egov_id` (`egov_id`),
  ADD KEY `patents_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Indexes for table `post_tickets`
--
ALTER TABLE `post_tickets`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `professional_activity_attendees`
--
ALTER TABLE `professional_activity_attendees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `egov_id` (`egov_id`);

--
-- Indexes for table `professional_activity_attendee_staff`
--
ALTER TABLE `professional_activity_attendee_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `paas_staff_id_foreign_key` (`staff_id`),
  ADD KEY `paas_paa_id_foreign_key` (`professional_activity_attendee_id`);

--
-- Indexes for table `professional_activity_conducteds`
--
ALTER TABLE `professional_activity_conducteds`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `professional_activity_conducted_staff`
--
ALTER TABLE `professional_activity_conducted_staff`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `professor_applications`
--
ALTER TABLE `professor_applications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `programs_department_id_foreign` (`department_id`);

--
-- Indexes for table `publications`
--
ALTER TABLE `publications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `publications_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `qualifications`
--
ALTER TABLE `qualifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `qualification_staff`
--
ALTER TABLE `qualification_staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `qualification_staffs_qualifications_id_foreign` (`qualification_id`),
  ADD KEY `qualification_staffs_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `religions`
--
ALTER TABLE `religions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `remunerationheads`
--
ALTER TABLE `remunerationheads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reviewer_editors`
--
ALTER TABLE `reviewer_editors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewer_editors_staff_id_foreign` (`staff_id`);

--
-- Indexes for table `schemes`
--
ALTER TABLE `schemes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `spocs`
--
ALTER TABLE `spocs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_castecategory_id_foreign` (`castecategory_id`),
  ADD KEY `staff_religion_id_foreign` (`religion_id`),
  ADD KEY `staff_user_id_foreign` (`user_id`);

--
-- Indexes for table `stafflics`
--
ALTER TABLE `stafflics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_stafflics_staff_id` (`staff_id`);

--
-- Indexes for table `stafflic_transactions`
--
ALTER TABLE `stafflic_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_st_stafflic_id` (`stafflic_id`);

--
-- Indexes for table `staffloans`
--
ALTER TABLE `staffloans`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staffremunerationheads`
--
ALTER TABLE `staffremunerationheads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staffremunerationheads_staff_id_foreign` (`staff_id`),
  ADD KEY `staffremunerationheads_remunerationhead_id_foreign` (`remunerationhead_id`);

--
-- Indexes for table `staffsalaries`
--
ALTER TABLE `staffsalaries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staffshares`
--
ALTER TABLE `staffshares`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staff_form16s`
--
ALTER TABLE `staff_form16s`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_staff_form16_staff_id` (`staff_id`);

--
-- Indexes for table `staff_taxregime`
--
ALTER TABLE `staff_taxregime`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_str_staff_id` (`staff_id`),
  ADD KEY `fk_tax_heads_id` (`tax_heads_id`);

--
-- Indexes for table `staff_tds`
--
ALTER TABLE `staff_tds`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_tds_staff_id_foreign` (`staff_id`),
  ADD KEY `staff_tds_staffsalary_id_foreign` (`staffsalary_id`),
  ADD KEY `staff_tds_staff_taxregime_id_foreign` (`staff_taxregime_id`);

--
-- Indexes for table `staff_teaching_payscale`
--
ALTER TABLE `staff_teaching_payscale`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_teaching_payscale_staff_id_foreign` (`staff_id`),
  ADD KEY `staff_teaching_payscale_teaching_payscales_id_foreign` (`teaching_payscale_id`);

--
-- Indexes for table `stationaries`
--
ALTER TABLE `stationaries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stationary_indent_and_grants`
--
ALTER TABLE `stationary_indent_and_grants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_stationary_id_foreign` (`stationary_id`),
  ADD KEY `FK_dept_stationary_indent_id` (`dept_stationary_indent_id`);

--
-- Indexes for table `studentinternships`
--
ALTER TABLE `studentinternships`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_si_spoc_id` (`spoc_id`),
  ADD KEY `fk_si_industry_id` (`industry_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_students_staff_id` (`staff_id`);

--
-- Indexes for table `student_issues`
--
ALTER TABLE `student_issues`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `student_studentinternship`
--
ALTER TABLE `student_studentinternship`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_studentinternships_student_id_foreign` (`student_id`),
  ADD KEY `student_studentinternships_studentinternship_id_foreign` (`studentinternship_id`),
  ADD KEY `fk_ssiternship_department_id` (`department_id`),
  ADD KEY `fk_ssinternship_staff_id` (`staff_id`);

--
-- Indexes for table `tax_heads`
--
ALTER TABLE `tax_heads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tax_slabs`
--
ALTER TABLE `tax_slabs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tax_slabs_regime_id_foreign` (`regime_id`);

--
-- Indexes for table `tdsheads`
--
ALTER TABLE `tdsheads`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `teaching_payscales`
--
ALTER TABLE `teaching_payscales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payscales_designation_id_foreign` (`designations_id`);

--
-- Indexes for table `tenders`
--
ALTER TABLE `tenders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tenders_user_id_foreign` (`user_id`),
  ADD KEY `tenders_department_id_foreign` (`document`);

--
-- Indexes for table `tender_configs`
--
ALTER TABLE `tender_configs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tender_configs_tender_id` (`tender_id`);

--
-- Indexes for table `tender_config_vendors`
--
ALTER TABLE `tender_config_vendors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_tender_config_id` (`tender_configs_id`),
  ADD KEY `Foreign_t_vendor_id` (`t_vendor_id`);

--
-- Indexes for table `tender_departments`
--
ALTER TABLE `tender_departments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tender_departments_tender_id_foreign` (`tender_id`),
  ADD KEY `tender_departments_department_id_foreign` (`department_id`);

--
-- Indexes for table `tender_quote_otp`
--
ALTER TABLE `tender_quote_otp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tender_quote_otp_tender_id_foreign` (`tender_id`),
  ADD KEY `tender_quote_otp_t_vendor_id_foreign` (`t_vendor_id`);

--
-- Indexes for table `tender_t_vendor`
--
ALTER TABLE `tender_t_vendor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_tender_id` (`tender_id`),
  ADD KEY `FK_t_vendor_id` (`t_vendor_id`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tickets_user_id_foreign` (`user_id`);

--
-- Indexes for table `t_vendors`
--
ALTER TABLE `t_vendors`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `vendors`
--
ALTER TABLE `vendors`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `_domains_`
--
ALTER TABLE `_domains_`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admissions`
--
ALTER TABLE `admissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `allowances`
--
ALTER TABLE `allowances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `allowance_staff`
--
ALTER TABLE `allowance_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `annual_increments`
--
ALTER TABLE `annual_increments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `associate_professor_applications`
--
ALTER TABLE `associate_professor_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `associations`
--
ALTER TABLE `associations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `association_staff`
--
ALTER TABLE `association_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `autonomous_allowances`
--
ALTER TABLE `autonomous_allowances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `book_publications`
--
ALTER TABLE `book_publications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `castecategories`
--
ALTER TABLE `castecategories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `combine_leaves`
--
ALTER TABLE `combine_leaves`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conferences_attendees`
--
ALTER TABLE `conferences_attendees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conferences_attendee_staff`
--
ALTER TABLE `conferences_attendee_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conferences_conducteds`
--
ALTER TABLE `conferences_conducteds`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conferences_conducted_staff`
--
ALTER TABLE `conferences_conducted_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `consolidated_teaching_pays`
--
ALTER TABLE `consolidated_teaching_pays`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `consultancies`
--
ALTER TABLE `consultancies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coordinators`
--
ALTER TABLE `coordinators`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `copyrights`
--
ALTER TABLE `copyrights`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_student`
--
ALTER TABLE `course_student`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daywise_admission_counts`
--
ALTER TABLE `daywise_admission_counts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daywise__leaves`
--
ALTER TABLE `daywise__leaves`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `da_teaching_payscales`
--
ALTER TABLE `da_teaching_payscales`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `department_domains`
--
ALTER TABLE `department_domains`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `department_event`
--
ALTER TABLE `department_event`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `department_notice`
--
ALTER TABLE `department_notice`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `department_staff`
--
ALTER TABLE `department_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dept_mgtquota_admissions`
--
ALTER TABLE `dept_mgtquota_admissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dept_stationary_indents`
--
ALTER TABLE `dept_stationary_indents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `designations`
--
ALTER TABLE `designations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `designation_ntcpayscale`
--
ALTER TABLE `designation_ntcpayscale`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `designation_ntpayscale`
--
ALTER TABLE `designation_ntpayscale`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `designation_staff`
--
ALTER TABLE `designation_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_types`
--
ALTER TABLE `employee_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ev_requests`
--
ALTER TABLE `ev_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exam_section_issues`
--
ALTER TABLE `exam_section_issues`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_courses`
--
ALTER TABLE `fastrack_courses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_expenses`
--
ALTER TABLE `fastrack_expenses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_expenses_master`
--
ALTER TABLE `fastrack_expenses_master`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_instances`
--
ALTER TABLE `fastrack_instances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_instance_program`
--
ALTER TABLE `fastrack_instance_program`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_pays`
--
ALTER TABLE `fastrack_pays`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fastrack_staffs`
--
ALTER TABLE `fastrack_staffs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `festival_advances`
--
ALTER TABLE `festival_advances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fixed_nt_pays`
--
ALTER TABLE `fixed_nt_pays`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ftcourses`
--
ALTER TABLE `ftcourses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `funded_projects`
--
ALTER TABLE `funded_projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `general_achievements`
--
ALTER TABLE `general_achievements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `grading_staffs`
--
ALTER TABLE `grading_staffs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `holidayrhs`
--
ALTER TABLE `holidayrhs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `industries`
--
ALTER TABLE `industries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `industryintakes`
--
ALTER TABLE `industryintakes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `institutions`
--
ALTER TABLE `institutions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `institution_staff`
--
ALTER TABLE `institution_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `interactions`
--
ALTER TABLE `interactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `issue_timelines`
--
ALTER TABLE `issue_timelines`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laptoploans`
--
ALTER TABLE `laptoploans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead_interactions`
--
ALTER TABLE `lead_interactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead_program`
--
ALTER TABLE `lead_program`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_rules`
--
ALTER TABLE `leave_rules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_staff_applications`
--
ALTER TABLE `leave_staff_applications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_staff_entitlements`
--
ALTER TABLE `leave_staff_entitlements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mgmtmembers`
--
ALTER TABLE `mgmtmembers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `naacs`
--
ALTER TABLE `naacs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nbas`
--
ALTER TABLE `nbas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nba_programs`
--
ALTER TABLE `nba_programs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nirfs`
--
ALTER TABLE `nirfs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notices`
--
ALTER TABLE `notices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ntcpayscales`
--
ALTER TABLE `ntcpayscales`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ntcpayscale_staff`
--
ALTER TABLE `ntcpayscale_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ntissue_timelines`
--
ALTER TABLE `ntissue_timelines`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ntpayscales`
--
ALTER TABLE `ntpayscales`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ntpayscale_staff`
--
ALTER TABLE `ntpayscale_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patents`
--
ALTER TABLE `patents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `post_tickets`
--
ALTER TABLE `post_tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professional_activity_attendees`
--
ALTER TABLE `professional_activity_attendees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professional_activity_attendee_staff`
--
ALTER TABLE `professional_activity_attendee_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professional_activity_conducteds`
--
ALTER TABLE `professional_activity_conducteds`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professional_activity_conducted_staff`
--
ALTER TABLE `professional_activity_conducted_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professor_applications`
--
ALTER TABLE `professor_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `publications`
--
ALTER TABLE `publications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qualifications`
--
ALTER TABLE `qualifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qualification_staff`
--
ALTER TABLE `qualification_staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `religions`
--
ALTER TABLE `religions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `remunerationheads`
--
ALTER TABLE `remunerationheads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviewer_editors`
--
ALTER TABLE `reviewer_editors`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schemes`
--
ALTER TABLE `schemes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `spocs`
--
ALTER TABLE `spocs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stafflics`
--
ALTER TABLE `stafflics`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stafflic_transactions`
--
ALTER TABLE `stafflic_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staffloans`
--
ALTER TABLE `staffloans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staffremunerationheads`
--
ALTER TABLE `staffremunerationheads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staffsalaries`
--
ALTER TABLE `staffsalaries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staffshares`
--
ALTER TABLE `staffshares`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_form16s`
--
ALTER TABLE `staff_form16s`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_taxregime`
--
ALTER TABLE `staff_taxregime`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_tds`
--
ALTER TABLE `staff_tds`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_teaching_payscale`
--
ALTER TABLE `staff_teaching_payscale`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stationaries`
--
ALTER TABLE `stationaries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stationary_indent_and_grants`
--
ALTER TABLE `stationary_indent_and_grants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `studentinternships`
--
ALTER TABLE `studentinternships`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_issues`
--
ALTER TABLE `student_issues`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_studentinternship`
--
ALTER TABLE `student_studentinternship`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_heads`
--
ALTER TABLE `tax_heads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_slabs`
--
ALTER TABLE `tax_slabs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tdsheads`
--
ALTER TABLE `tdsheads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teaching_payscales`
--
ALTER TABLE `teaching_payscales`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tenders`
--
ALTER TABLE `tenders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tender_configs`
--
ALTER TABLE `tender_configs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tender_config_vendors`
--
ALTER TABLE `tender_config_vendors`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tender_departments`
--
ALTER TABLE `tender_departments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tender_quote_otp`
--
ALTER TABLE `tender_quote_otp`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tender_t_vendor`
--
ALTER TABLE `tender_t_vendor`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `t_vendors`
--
ALTER TABLE `t_vendors`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vendors`
--
ALTER TABLE `vendors`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `_domains_`
--
ALTER TABLE `_domains_`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `annual_increments`
--
ALTER TABLE `annual_increments`
  ADD CONSTRAINT `fk_ai_staff_id` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `association_staff`
--
ALTER TABLE `association_staff`
  ADD CONSTRAINT `association_staff_associations_id_foreign` FOREIGN KEY (`association_id`) REFERENCES `associations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `association_staff_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `autonomous_allowances`
--
ALTER TABLE `autonomous_allowances`
  ADD CONSTRAINT `autonomous_allowances_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `autonomous_allowances_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `book_publications`
--
ALTER TABLE `book_publications`
  ADD CONSTRAINT `book_publications_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `castecategories`
--
ALTER TABLE `castecategories`
  ADD CONSTRAINT `castecategories_religion_id_foreign` FOREIGN KEY (`religion_id`) REFERENCES `religions` (`id`);

--
-- Constraints for table `combine_leaves`
--
ALTER TABLE `combine_leaves`
  ADD CONSTRAINT `combine_leave_combined_id_foreign` FOREIGN KEY (`combined_id`) REFERENCES `leaves` (`id`),
  ADD CONSTRAINT `combine_leave_leave_id_foreign` FOREIGN KEY (`leave_id`) REFERENCES `leaves` (`id`);

--
-- Constraints for table `conferences_attendee_staff`
--
ALTER TABLE `conferences_attendee_staff`
  ADD CONSTRAINT `conferences_attendee_staff_conferences_attendee_id_foreign` FOREIGN KEY (`conferences_attendee_id`) REFERENCES `conferences_attendees` (`id`),
  ADD CONSTRAINT `conferences_attendee_staff_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `conferences_conducted_staff`
--
ALTER TABLE `conferences_conducted_staff`
  ADD CONSTRAINT `conferences_conducted_staff_conferences_conducted_id_foreign` FOREIGN KEY (`conferences_conducted_id`) REFERENCES `conferences_conducteds` (`id`),
  ADD CONSTRAINT `conferences_conducted_staff_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `consultancies`
--
ALTER TABLE `consultancies`
  ADD CONSTRAINT `consultancies_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `daywise__leaves`
--
ALTER TABLE `daywise__leaves`
  ADD CONSTRAINT `fk_leave_staff_application_id` FOREIGN KEY (`leave_staff_applications_id`) REFERENCES `leave_staff_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_user_id` FOREIGN KEY (`hod_user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `department_domains`
--
ALTER TABLE `department_domains`
  ADD CONSTRAINT `department_domains_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `dept_stationary_indents`
--
ALTER TABLE `dept_stationary_indents`
  ADD CONSTRAINT `fk_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);

--
-- Constraints for table `fastrack_courses`
--
ALTER TABLE `fastrack_courses`
  ADD CONSTRAINT `FK_instance_id` FOREIGN KEY (`ft_instance_id`) REFERENCES `fastrack_instances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fastrack_courses_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `foreign_ft_course_type_id` FOREIGN KEY (`ft_course_type_id`) REFERENCES `ftcourses` (`id`);

--
-- Constraints for table `fastrack_expenses`
--
ALTER TABLE `fastrack_expenses`
  ADD CONSTRAINT `ft_expense_master_id` FOREIGN KEY (`ft_expense_master_id`) REFERENCES `fastrack_expenses_master` (`id`);

--
-- Constraints for table `fastrack_instances`
--
ALTER TABLE `fastrack_instances`
  ADD CONSTRAINT `fastrack_instances_scheme_id_foreign` FOREIGN KEY (`scheme_id`) REFERENCES `schemes` (`id`);

--
-- Constraints for table `fastrack_instance_program`
--
ALTER TABLE `fastrack_instance_program`
  ADD CONSTRAINT `fastrack_instance_programs_fastrack_instance_id_foreign` FOREIGN KEY (`fastrack_instance_id`) REFERENCES `fastrack_instances` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fastrack_instance_programs_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fastrack_staffs`
--
ALTER TABLE `fastrack_staffs`
  ADD CONSTRAINT `fastrack_staffs_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `fastrack_courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fastrack_staffs_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `institution_staff`
--
ALTER TABLE `institution_staff`
  ADD CONSTRAINT `institution_staff_institution_id_foreign` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `institution_staff_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lead_interactions`
--
ALTER TABLE `lead_interactions`
  ADD CONSTRAINT `lead_interactions_lead_id_foreign` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lead_interactions_user_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `lead_program`
--
ALTER TABLE `lead_program`
  ADD CONSTRAINT `lead_program_lead_id_foreign` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`),
  ADD CONSTRAINT `lead_program_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave_rules`
--
ALTER TABLE `leave_rules`
  ADD CONSTRAINT `fk_leave_rule_leave_id` FOREIGN KEY (`leave_id`) REFERENCES `leaves` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `staffremunerationheads`
--
ALTER TABLE `staffremunerationheads`
  ADD CONSTRAINT `FK_STAFF_ID` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`),
  ADD CONSTRAINT `FK_remunerationhead_id` FOREIGN KEY (`remunerationhead_id`) REFERENCES `remunerationheads` (`id`);

--
-- Constraints for table `staff_tds`
--
ALTER TABLE `staff_tds`
  ADD CONSTRAINT `staff_tds_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`),
  ADD CONSTRAINT `staff_tds_staff_taxregime_id_foreign` FOREIGN KEY (`staff_taxregime_id`) REFERENCES `staff_taxregime` (`id`),
  ADD CONSTRAINT `staff_tds_staffsalary_id_foreign` FOREIGN KEY (`staffsalary_id`) REFERENCES `staffsalaries` (`id`);

--
-- Constraints for table `stationary_indent_and_grants`
--
ALTER TABLE `stationary_indent_and_grants`
  ADD CONSTRAINT `FK_dept_stationary_indent_id` FOREIGN KEY (`dept_stationary_indent_id`) REFERENCES `dept_stationary_indents` (`id`),
  ADD CONSTRAINT `FK_stationary_id_foreign` FOREIGN KEY (`stationary_id`) REFERENCES `stationaries` (`id`);

--
-- Constraints for table `tenders`
--
ALTER TABLE `tenders`
  ADD CONSTRAINT `tenders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `tender_configs`
--
ALTER TABLE `tender_configs`
  ADD CONSTRAINT `fk_tender_configs_tender_id` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tender_config_vendors`
--
ALTER TABLE `tender_config_vendors`
  ADD CONSTRAINT `FK_tender_config_id` FOREIGN KEY (`tender_configs_id`) REFERENCES `tender_configs` (`id`),
  ADD CONSTRAINT `Foreign_t_vendor_id` FOREIGN KEY (`t_vendor_id`) REFERENCES `t_vendors` (`id`);

--
-- Constraints for table `tender_departments`
--
ALTER TABLE `tender_departments`
  ADD CONSTRAINT `tender_departments_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `tender_departments_tender_id_foreign` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`);

--
-- Constraints for table `tender_quote_otp`
--
ALTER TABLE `tender_quote_otp`
  ADD CONSTRAINT `tender_quote_otp_t_vendor_id_foreign` FOREIGN KEY (`t_vendor_id`) REFERENCES `t_vendors` (`id`),
  ADD CONSTRAINT `tender_quote_otp_tender_id_foreign` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`);

--
-- Constraints for table `tender_t_vendor`
--
ALTER TABLE `tender_t_vendor`
  ADD CONSTRAINT `FK_t_vendor_id` FOREIGN KEY (`t_vendor_id`) REFERENCES `t_vendors` (`id`),
  ADD CONSTRAINT `FK_tender_id` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`);
COMMIT;


