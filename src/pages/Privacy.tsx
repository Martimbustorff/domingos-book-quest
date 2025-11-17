import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Privacy Policy</h1>
        </div>

        <Card className="p-6 sm:p-8 space-y-6">
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
            <p className="text-foreground">
              Domingos Book Quest is committed to protecting the privacy of children who use our educational platform. 
              This Privacy Policy explains how we collect, use, and protect information in compliance with the 
              Children's Online Privacy Protection Act (COPPA).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">1. Information We Collect</h2>
            <p className="text-foreground">
              Our platform is designed to minimize data collection from children. We collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li><strong>Account Information:</strong> When users create an account, we collect an email address and password (for authentication only)</li>
              <li><strong>Quiz Activity:</strong> We track quiz completion, scores, and progress to provide educational feedback</li>
              <li><strong>Technical Information:</strong> We automatically collect browser type, device information, and usage patterns to improve our service</li>
              <li><strong>No Personal Identifiers:</strong> We do not collect names, addresses, phone numbers, or photos from children</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">2. How We Use Information</h2>
            <p className="text-foreground">We use collected information solely to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Provide and improve our educational quiz service</li>
              <li>Track learning progress and quiz achievements</li>
              <li>Maintain account security</li>
              <li>Analyze usage patterns to enhance the platform</li>
            </ul>
            <p className="text-foreground font-semibold">
              We never sell, rent, or share children's personal information with third parties for marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">3. COPPA Compliance</h2>
            <p className="text-foreground">
              Our service is designed for children aged 5-13. In accordance with COPPA:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>We do not knowingly collect personal information from children without parental consent</li>
              <li>Parents can review, delete, or refuse further collection of their child's information</li>
              <li>We maintain reasonable security measures to protect collected data</li>
              <li>We do not require children to disclose more information than reasonably necessary</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">4. Parental Rights</h2>
            <p className="text-foreground">Parents have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Review the personal information we have collected from their child</li>
              <li>Request deletion of their child's personal information</li>
              <li>Refuse further collection or use of their child's information</li>
              <li>Access and modify their child's account settings</li>
            </ul>
            <p className="text-foreground">
              To exercise these rights, parents can access the Settings page or contact us through the support channels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">5. Data Security</h2>
            <p className="text-foreground">
              We implement industry-standard security measures to protect user information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure authentication systems</li>
              <li>Regular security audits</li>
              <li>Limited staff access to user data</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">6. Third-Party Services</h2>
            <p className="text-foreground">
              Our platform uses Supabase for backend services (authentication and data storage). Supabase 
              complies with GDPR and maintains strict security standards. We do not use third-party 
              advertising or tracking services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">7. Data Retention</h2>
            <p className="text-foreground">
              We retain user information only as long as necessary to provide our services and comply with legal obligations. 
              Quiz history and progress data are retained to enable continuous learning experiences. Users may request 
              account deletion at any time through the Settings page.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">8. International Users</h2>
            <p className="text-foreground">
              Our service is provided globally. By using Domingos Book Quest, users consent to the transfer and 
              processing of information in accordance with this Privacy Policy and applicable laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">9. Changes to This Policy</h2>
            <p className="text-foreground">
              We may update this Privacy Policy periodically. We will notify users of significant changes by 
              updating the "Last Updated" date and providing notice on our platform. Continued use of the service 
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">10. Contact Information</h2>
            <p className="text-foreground">
              For questions about this Privacy Policy, to exercise parental rights, or to report privacy concerns:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Access the Settings page within the application</li>
              <li>Use the contact form available in the app</li>
            </ul>
            <p className="text-foreground">
              We are committed to addressing privacy inquiries promptly and transparently.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground italic">
              This privacy policy is designed to comply with COPPA (Children's Online Privacy Protection Act) 
              and other applicable privacy regulations. We are committed to providing a safe, educational 
              environment for children.
            </p>
          </section>
        </Card>

        <div className="flex justify-center pt-4">
          <Button onClick={() => navigate("/")} size="lg">
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
